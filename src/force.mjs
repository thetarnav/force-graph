import * as la    from "./linalg.mjs"
import * as math  from "./math.mjs"
import * as array from "./array.mjs"

const Vec = la.Vec2
const vec = la.vec2
/** @typedef {la.Vec2} Vec */

/**
 @typedef {object} Options
 
 @property {number} inertia_strength
 Percent of velocity to retain each frame.
 ```ts
 velocity *= inertia_strength
 ```

 @property {number} repel_strength
 Strength of nodes pushing each other away.
 ```ts
 force = repel_strength * (1 - distance / repel_distance)
 velocity += (delta / distance) * force
 ```

 @property {number} repel_distance
 Distance at which nodes start to repel each other.
 
 @property {number} link_strength
 Strength of the connection between nodes.
 ```ts
 velocity += (delta * link_strength) / n_edges
 ```
 
 @property {number} origin_strength
 Pull towards the origin.
 ```ts
 velocity += origin_position - node_position * origin_strength
 ```
 
 @property {number} min_move
 Minimum velocity to move a node.

 @property {number} grid_size
 Size of the grid used for spatial lookup. Node positions will be clamped to this size.
*/

/** @type {Options} */
export const DEFAULT_OPTIONS = {
	inertia_strength: 0.7,
	repel_strength:   0.4,
	repel_distance:   20,
	link_strength:    0.025,
	origin_strength:  0.012,
	min_move:         0.001,
	grid_size:        200,
}

/**
 @typedef {object} Graph

 @property {Options}  options
 @property {Node[]}   nodes
 @property {Edge[]}   edges

 @property {Node[][]} grid
 Spatial grid for looking up surrounding nodes by their position.

 The first index is the matrix cell calculated from the x and y position of the node.

 The second index is the index of the node in the call array,
 sorted by x position. Low to High.
 
 @property {number} max_pos
*/

/**
 @typedef {object} Edge

 @property {Node}   a
 @property {Node}   b
 @property {number} strength
*/

/**
 @typedef {object} Node

 @property {unknown} key
 User data key.
 Use it to identify the node in the graph, and match it with additional data.
 Otherwise, you can use object references to match nodes.

 @property {string}  label
 Label to display on the node when rendering. Set it to an empty string to hide the label.

 @property {Vec}     pos
 Current position of the node.

 @property {Vec}     vel
 Current node velocity, will be added to the position each frame.

 @property {number}  mass
 Can be calculated with `node_mass_from_edges`

 @property {boolean} anchor
 Do not change the position of this node.

 @property {boolean} moved
 Has the node moved since the last frame?

 This value is not changed back to `false` automatically. Change it manually if you handled
 the movement.
*/

/**
 get a zero initialized node
 ```ts
 const node = make_node()
 node.label = "hello"
 node.key   = 1
 ```
 @returns {Node}
*/
export function make_node() {
	return {
		key:    undefined,
		label:  "",
		pos:    new Vec,
		vel:    new Vec,
		mass:   1,
		anchor: false,
		moved:  false,
	}
}

/**
 Create a graph from given options

 @param   {Options} options
 @returns {Graph}   */
export function make_graph(options) {
	let cols = get_grid_cols(options)
	let grid = Array.from({length: cols*cols}, () => [])

	return {
		nodes:   [],
		edges:   [],
		grid:    grid,
		options: options,
		max_pos: math.find_open_upper_bound(options.grid_size),
	}
}


/**
 @param   {number} edges_length
 @returns {number} */
export function node_mass_from_edges(edges_length) {
	return Math.log2(edges_length + 2)
}


/**
 @param   {Options} options
 @returns {number}  */
export function get_grid_cols(options) {
	return Math.ceil(options.grid_size / 2 / options.repel_distance) * 2
}

/**
 * **Note:** This function does not clamp the position to the grid.
 * @param   {Options} options
 * @param   {Vec}     pos
 * @returns {number}  */
export function pos_to_grid_idx(options, pos) {
	let xi = Math.floor(pos.x / options.repel_distance)
	let yi = Math.floor(pos.y / options.repel_distance)
	return xi + yi * get_grid_cols(options)
}


/**
 @param   {Graph} g
 @param   {Edge}  edge
 @returns {void}  */
export function add_edge(g, edge) {
	g.edges.push(edge)
}

/**
 @param   {Graph}           g
 @param   {readonly Edge[]} edges
 @returns {void}            */
export function add_edges(g, edges) {
	g.edges.push(...edges)
}


/**
 @param   {Graph} g
 @param   {Node}  node
 @returns {void}  */
export function add_node(g, node) {
	g.nodes.push(node)
	add_node_to_grid(g, node)
}

/**
 @param   {Graph}           g
 @param   {readonly Node[]} nodes
 @returns {void}            */
export function add_nodes(g, nodes) {
	g.nodes.push(...nodes)
	add_nodes_to_grid(g, nodes)
}


/**
 @param   {Graph} g
 @returns {void} */
export function clear_nodes(g) {
	g.nodes.length = 0
	g.edges.length = 0
	for (let cell of g.grid) {
		cell.length = 0
	}
}

/**
 @param {Graph} g 
 @param {Node} node 
 @param {number} cell_idx 
*/
export function add_node_to_grid(g, node, cell_idx = pos_to_grid_idx(g.options, node.pos)) {

	let cell = g.grid[cell_idx]
	let i    = 0
	while (i < cell.length && cell[i].pos.x < node.pos.x) {
		i++
	}
	cell.splice(i, 0, node)
}

/**
 @param {Graph} g
 @param {readonly Node[]} nodes
 @returns {void} */
export function add_nodes_to_grid(g, nodes) {
	for (const node of nodes) {
		add_node_to_grid(g, node)
	}
}


/**
 @param {Graph} g
 @param {Node} a
 @param {Node} b
 @returns {number} */
export function get_edge_idx(g, a, b) {
	for (let i = 0; i < g.edges.length; i++) {
		let edge = g.edges[i]
		if ((edge.a === a && edge.b === b) ||
		    (edge.a === b && edge.b === a)) {
			return i
		}
	}
	return -1
}


/**
 @param {Graph} g
 @param {Node} a
 @param {Node} b
 @returns {Edge | undefined} */
export function get_edge(g, a, b) {
	let idx = get_edge_idx(g, a, b)
	if (idx != -1) {
		return g.edges[idx]
	}
}

/**
 @param {Edge} edge
 @param {Node} node
 @returns {Node | null} */
export function get_connection(edge, node) {
	if (edge.a === node) return edge.b
	if (edge.b === node) return edge.a
	return null
}


/** 
 @param   {Graph} g 
 @param   {Node} node 
 @returns {IterableIterator<Edge>} */
export function* each_node_edge(g, node) {
	for (let edge of g.edges) {
		if (edge.a === node || edge.b === node)
			yield edge
	}	
}
/** 
 @param   {Graph} g 
 @param   {Node} node 
 @returns {IterableIterator<Node>} */
export function* each_node_connection(g, node) {
	for (let edge of g.edges) {
		if (edge.a === node)
			yield edge.b
		else if (edge.b === node)
			yield edge.a
	}	
}


/**
 @param {Graph} g
 @param {Node} node
 @returns {Edge[]} */
export function get_node_edges(g, node) {
	return Array.from(each_node_edge(g, node))
}

/**
 @param {Graph} g
 @param {Node} node
 @returns {Node[]} */
export function get_node_connections(g, node) {
	return Array.from(each_node_connection(g, node))
}
 
/**
 Connects two nodes and returns the new edge.

 **It doesn't check if the nodes are already connected.** Use `get_edge` to check before
 connecting.
 
 @param   {Graph}  g
 @param   {Node}   a
 @param   {Node}   b
 @param   {number} [strength]
 @returns {Edge}   */
export function connect(g, a, b, strength = 1) {
	/** @type {Edge} */
	let edge = {a, b, strength}
	g.edges.push(edge)
	return edge
}


/**
 @param {Graph} g
 @param {Node}  a
 @param {Node}  b */
export function disconnect(g, a, b) {
	let idx = get_edge_idx(g, a, b)
	if (idx != -1) {
		array.unordered_remove(g.edges, idx)
	}
}
 
/**
 Returns the closest node to the given position.

 The search is done linearly, so it scales O(n) with the number of nodes.

 It does a simple search, witout assuming anything about the gird.

 @param {Graph} g
 @param {Vec} pos
 @param {number} [max_dist]
 @returns {Node | null} */
export function find_closest_node_linear(g, pos, max_dist = Infinity) {
	/** @type {Node | null} */
	let closest_node = null
	let closest_dist = max_dist

	for (let node of g.nodes) {
		let dist = la.vec_distance(node.pos, pos)
		if (dist < closest_dist) {
			closest_node = node
			closest_dist = dist
		}
	}

	return closest_node
}

/**
 Returns the closest node to the given position.

 The search is done using a grid, so it scales O(log n) with the number of nodes.

 The implementation assumes that the max_dist is smaller than the cell size. So it will only
 return nodes very close to the position.

 Position outside of the graph will return `undefined`.

 @param {Graph} g
 @param {Vec} pos
 @param {number} [max_dist]
 @returns {Node | null} */
export function find_closest_node(g, pos, max_dist = Infinity) {
	let {x, y} = pos

	if (x < 0 || x > g.options.grid_size || y < 0 || y > g.options.grid_size) {
		return null
	}

	let grid_cols  = get_grid_cols(g.options)
	let pos_idx    = pos_to_grid_idx(g.options, pos)
	let x_axis_idx = pos_idx % grid_cols
	let y_axis_idx = Math.floor(pos_idx / grid_cols)

	/*
		1 | -1, depending on which side of the cell the position is on
	*/
	let idx_dx = Math.floor(math.remainder(x/g.options.repel_strength, 1) + 0.5) * 2 - 1
	let idx_dy = Math.floor(math.remainder(y/g.options.repel_strength, 1) + 0.5) * 2 - 1

	/*
		clamp the index to the grid -> 1 | 0 | -1
	*/
	idx_dx = math.clamp(idx_dx, -x_axis_idx, grid_cols -1 -x_axis_idx)
	idx_dy = math.clamp(idx_dy, -y_axis_idx, grid_cols -1 -y_axis_idx)

	let closest_dist = max_dist
	/** @type {Node | null} */
	let closest_node = null

	/*
		check the 4 cells around the position
		including the cell the position is in
	*/
	for (let xi = 0; xi <= 1; xi++) {
		let dxi = idx_dx * xi

		for (let yi = 0; yi <= 1; yi++) {
			let idx = pos_idx + dxi + grid_cols * idx_dy * yi
			let order = g.grid[idx]

			if (dxi == -1) {
				/*
					right to left
				*/
				for (let i = order.length - 1; i >= 0; i--) {
					let node = order[i]
					if (x - node.pos.x > closest_dist) break

					let dist = la.vec_distance(pos, node.pos)
					if (dist < closest_dist) {
						closest_dist = dist
						closest_node = node
					}
				}
			} else {
				/*
					left to right
				*/
				for (let node of order) {
					if (x - node.pos.x > closest_dist) continue
					if (node.pos.x - x > closest_dist) break

					let dist = la.vec_distance(pos, node.pos)
					if (dist < closest_dist) {
						closest_dist = dist
						closest_node = node
					}
				}
			}
		}
	}

	return closest_node
}

/**
 Set positions for all nodes randomly around the whole grid.
 Will give different result each time.
 @param {Graph} g
 @returns {void} */
export function set_positions_random(g) {
	
	let margin = g.options.grid_size/4
	for (let node of g.nodes) {
		let x = math.random_from_to(margin, g.options.grid_size - margin)
		let y = math.random_from_to(margin, g.options.grid_size - margin)
		set_position_xy(g, node, x, y)
	}
}

/**
 Set positions for all nodes distributed evenly around the whole grid.
 Will give the same result each time.
 @param {Graph} g
 @returns {void} */
export function set_positions_spread(g) {

	let margin    = g.options.grid_size/4
	let max_width = g.options.grid_size - margin*2
	let cols      = get_grid_cols(g.options)

	for (let i = 0; i < g.nodes.length; i++) {
		let x = margin + i%cols/cols                 * max_width
		let y = margin + Math.ceil(i/cols)%cols/cols * max_width
		set_position_xy(g, g.nodes[i], x, y)
	}
}

/**
 Set positions for all nodes based on their connections and mass.
 Approximates state of the graph after the simulation has been played out.
 Minimizes movement.
 Will give the same result each time.
 @param {Graph} g
 @returns {void} */
export function set_positions_smart(g) {

	if (g.nodes.length === 0) return
	
	let mid    = g.options.grid_size/2
	/** @type {WeakSet<Node>} */
	let placed = new WeakSet()
	/** @type {Map<number, number>} */
	let n_map  = new Map()

	for (let node of g.nodes) {
		let x = mid, y = mid, placed_conns = 0
	
		for (let b of each_node_connection(g, node)) {
			if (!placed.has(b)) continue
	
			if (placed_conns === 0) {
				x = b.pos.x
				y = b.pos.y
			} else {
				x = (x+b.pos.x)/2
				y = (y+b.pos.y)/2
			}
			placed_conns++
		}
	
		if (placed_conns <= 1) {
			let hash = la.xy_hash(x, y)
			
			let n = n_map.get(hash) ?? 0
			n_map.set(hash, n+1)
			
			for (let radius = 0, max_n = 0;;) {
				radius += 5
				if (radius > mid) break
	
				n -= max_n
				max_n = la.floor(la.circumference(radius)/6)
				if (n >= max_n) continue
	
				let theta = la.TAU * n/max_n + hash
				let new_x = x + radius * la.cos(theta)
				let new_y = x + radius * la.sin(theta)
				if (new_x < 0 || new_x >= g.options.grid_size || new_y < 0 || new_y >= g.options.grid_size) {
					n += max_n + 1
					continue
				}
				
				x = new_x
				y = new_y
				break
			}
		}
	
		placed.add(node)
		set_position_xy(g, node, x, y)
	}
}


/**
 @param {Graph} g
 @param {Node} node
 @param {Vec} pos
 @returns {void} */
export function set_position(g, node, pos) {
	set_position_xy(g, node, pos.x, pos.y)
}

/**
 @param {Graph} g
 @param {Node} node
 @param {number} x
 @param {number} y
 @returns {void} */
export function set_position_xy(g, node, x, y) {
	let prev_idx = pos_to_grid_idx(g.options, node.pos)
	let prev_x   = node.pos.x

	node.pos.x = math.clamp(x, 0, g.max_pos)
	node.pos.y = math.clamp(y, 0, g.max_pos)
	node.moved = true

	let idx   = pos_to_grid_idx(g.options, node.pos)
	let cell  = g.grid[prev_idx]
	let order = cell.indexOf(node)

	if (idx !== prev_idx) {
		cell.splice(order, 1)
		add_node_to_grid(g, node, idx)
	} else {
		/*
		1  3  5 (2) 9
		1  3  2<>5  9
		1  2<>3  5  9
		*/
		if (x - prev_x < 0) {
			for (let i = order-1; i >= 0 && cell[i].pos.x > x; i--) {
				[cell[i+1], cell[i]] = [cell[i], cell[i+1]]
			}
		} else {
			for (let i = order+1; i < cell.length && cell[i].pos.x < x; i++) {
				[cell[i-1], cell[i]] = [cell[i], cell[i-1]]
			}
		}
	}
}


/**
 @param {Graph} g
 @param {Node} a
 @param {Node} b
 @param {number} dx
 @param {number} dy
 @param {number} alpha
 @returns {void} */
export function push_nodes_away(g, a, b, dx, dy, alpha) {
	let d = Math.sqrt(dx*dx + dy*dy)

	if (d >= g.options.repel_distance) return

	let f  = g.options.repel_strength * (1 - d / g.options.repel_distance) * alpha
	let mx = dx/d * f
	let my = dy/d * f

	a.vel.x += mx/a.mass * b.mass
	a.vel.y += my/a.mass * b.mass
	b.vel.x -= mx/b.mass * a.mass
	b.vel.y -= my/b.mass * a.mass
}

/**
 Simulates the graph for one frame.

 Updates the velocity, position and moved flag of each node.

 @param g The graph to simulate {@link Graph}
 @param alpha The simulation speed multiplier. Default is 1. Use this to slow down or speed up the
   simulation with time.
*/

/**
 @param {Graph} g
 @param {number} [alpha]
 @returns {void} */
export function simulate(g, alpha = 1) {
	let {nodes, edges, grid, options} = g

	let grid_cols = get_grid_cols(g.options)

	for (let node of nodes) {
		let {vel, pos} = node
		let {x, y} = pos

		/*
			towards the origin
		*/
		vel.x += (options.grid_size/2 - x) * options.origin_strength * alpha / node.mass
		vel.y += (options.grid_size/2 - y) * options.origin_strength * alpha / node.mass

		/*
			away from other nodes
			look only at the nodes right to the current node
			and apply the force to both nodes
		*/
		let node_idx      = pos_to_grid_idx(options, pos)
		let dy_min        = -(node_idx >= grid_cols)
		let dy_max        = +(node_idx < grid.length - grid_cols)
		let at_right_edge = node_idx % grid_cols === grid_cols-1

		for (let dy_idx = dy_min; dy_idx <= dy_max; dy_idx++) {

			let idx = node_idx + dy_idx * grid_cols

			/*
				from the right cell edge to the node
			*/
			let order = grid[idx]

			for (let i = order.length - 1; i >= 0; i--) {
				let node_b = order[i]
				let dx = x - node_b.pos.x

				if (dx > 0) break

				let dy = y - node_b.pos.y

				if (dx === 0 && dy >= 0) continue

				push_nodes_away(g, node, node_b, dx, dy, alpha)
			}

			/*
				from the left edge of neighboring right cell to the end of repel distance
			*/
			if (at_right_edge) continue

			order = grid[idx+1]

			for (let node_b of order) {
				let dx = x - node_b.pos.x

				if (dx <= -options.repel_distance) break

				let dy = y - node_b.pos.y

				push_nodes_away(g, node, node_b, dx, dy, alpha)
			}
		}
	}

	/*
		towards the edges
		the more edges a node has, the more velocity it accumulates
		so the velocity is divided by the number of edges
	*/
	for (let {a, b, strength} of edges) {

		let dx = (b.pos.x - a.pos.x) * options.link_strength * strength * alpha
		let dy = (b.pos.y - a.pos.y) * options.link_strength * strength * alpha

		a.vel.x += dx / a.mass / a.mass
		a.vel.y += dy / a.mass / a.mass
		b.vel.x -= dx / b.mass / b.mass
		b.vel.y -= dy / b.mass / b.mass
	}

	for (let node of nodes) {
		let {vel, pos} = node

		/*
			commit and sort
		*/
		if (!node.anchor) {
			if (vel.x*vel.x + vel.y*vel.y > options.min_move) {
				set_position_xy(g, node, pos.x+vel.x, pos.y+vel.y)
			}
		}

		/*
			inertia
		*/
		vel.x *= options.inertia_strength * alpha
		vel.y *= options.inertia_strength * alpha
	}
}
