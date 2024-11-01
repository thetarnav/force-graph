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

 @property {Quad_Tree_Node} quad_tree
 Quad-tree used for spatial partitioning and force calculations.
 
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
 @typedef {object} Quad_Tree_Node

 @property {number} xmin
 @property {number} ymin
 @property {number} xmax
 @property {number} ymax

 @property {number} mass
 @property {number} com_x
 @property {number} com_y

 @property {Node | null} node

 @property {Quad_Tree_Node | null} nw
 @property {Quad_Tree_Node | null} ne
 @property {Quad_Tree_Node | null} sw
 @property {Quad_Tree_Node | null} se

 @property {boolean} is_leaf
}

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
	let cols = Math.ceil(options.grid_size / 2 / options.repel_distance) * 2

	return {
        nodes:   [],
        edges:   [],
        options: options,
        max_pos: math.find_open_upper_bound(options.grid_size),
        quad_tree: /** @type {*} */(null),
	}
}

/**
 @param   {number} edges_length
 @returns {number} */
export function node_mass_from_edges(edges_length) {
	return Math.log2(edges_length + 2)
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
}

/**
 @param   {Graph}           g
 @param   {readonly Node[]} nodes
 @returns {void}            */
export function add_nodes(g, nodes) {
	g.nodes.push(...nodes)
}


/**
 @param   {Graph} g
 @returns {void} */
export function clear_nodes(g) {
	g.nodes.length = 0
	g.edges.length = 0
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
 Set positions for all nodes distributed evenly around the whole grid.
 Will give the same result each time.
 @param {Graph} g
 @returns {void} */
export function set_positions_spread(g) {

    const nodes     = g.nodes
    const count     = nodes.length
    const grid_size = Math.ceil(Math.sqrt(count))
    const spacing   = g.options.grid_size / grid_size

    for (let i = 0; i < count; i++) {
        const node  = nodes[i]
        const x_idx = i % grid_size
        const y_idx = Math.floor(i / grid_size)

        node.pos.x = x_idx * spacing + spacing / 2
        node.pos.y = y_idx * spacing + spacing / 2

        node.vel.x = 0
        node.vel.y = 0
    }
}

/**
 Simulates the graph for one frame.

 Updates the velocity, position and moved flag of each node.

 @param g The graph to simulate {@link Graph}
 @param alpha The simulation speed multiplier. Default is 1. Use this to slow down or speed up the
   simulation with time.
*/

/**
 * Build the quad-tree from the current node positions.
 * @param {Graph} g
 * @returns {void}
 */
export function build_quad_tree(g) {
    const size = g.options.grid_size
    g.quad_tree = make_quad_tree_node(0, 0, size, size)

    for (const node of g.nodes) {
        insert_node_quad_tree(g.quad_tree, node)
    }
}

/**
 * Create a new QuadTreeNode.
 * @param {number} xmin
 * @param {number} ymin
 * @param {number} xmax
 * @param {number} ymax
 * @returns {Quad_Tree_Node}
 */
function make_quad_tree_node(xmin, ymin, xmax, ymax) {
    return {
        xmin,
        ymin,
        xmax,
        ymax,
        mass: 0,
        com_x: 0,
        com_y: 0,
        node: null,
        nw: null,
        ne: null,
        sw: null,
        se: null,
        is_leaf: true,
    }
}

/**
 * Insert a node into the quad-tree.
 * @param {Quad_Tree_Node} quad_node
 * @param {Node} node
 * @returns {void}
 */
function insert_node_quad_tree(quad_node, node) {
    if (quad_node.is_leaf) {
        if (quad_node.node == null) {
            // Empty leaf node, insert the node here
            quad_node.node = node
            quad_node.mass = node.mass
            quad_node.com_x = node.pos.x * node.mass
            quad_node.com_y = node.pos.y * node.mass
        } else {
            // Subdivide the quad-node and re-insert the existing node
            subdivide_quad_node(quad_node)
            insert_node_quad_tree(quad_node, node)
        }
    } else {
        // Update center of mass and mass
        quad_node.mass += node.mass
        quad_node.com_x += node.pos.x * node.mass
        quad_node.com_y += node.pos.y * node.mass

        // Insert the node into the appropriate child
        const child = get_quad_child(quad_node, node.pos)
        insert_node_quad_tree(child, node)
    }
}

/**
 * Subdivide a quad-tree node into four children.
 * @param {Quad_Tree_Node} quad_node
 * @returns {void}
 */
function subdivide_quad_node(quad_node) {
    const { xmin, ymin, xmax, ymax, node } = quad_node
    const xmid = (xmin + xmax) / 2
    const ymid = (ymin + ymax) / 2

    quad_node.nw = make_quad_tree_node(xmin, ymin, xmid, ymid)
    quad_node.ne = make_quad_tree_node(xmid, ymin, xmax, ymid)
    quad_node.sw = make_quad_tree_node(xmin, ymid, xmid, ymax)
    quad_node.se = make_quad_tree_node(xmid, ymid, xmax, ymax)

    quad_node.is_leaf = false

    // Re-insert the existing node into the appropriate child
    if (node != null) {
        const child = get_quad_child(quad_node, node.pos)
        insert_node_quad_tree(child, node)
        quad_node.node = null
    }

    // Initialize mass and center of mass
    quad_node.mass = quad_node.nw.mass + quad_node.ne.mass + quad_node.sw.mass + quad_node.se.mass
    quad_node.com_x = quad_node.nw.com_x + quad_node.ne.com_x + quad_node.sw.com_x + quad_node.se.com_x
    quad_node.com_y = quad_node.nw.com_y + quad_node.ne.com_y + quad_node.sw.com_y + quad_node.se.com_y
}

/**
 * Get the child quad-tree node that contains the given position.
 * @param {Quad_Tree_Node} quad_node
 * @param {Vec} pos
 * @returns {Quad_Tree_Node}
 */
function get_quad_child(quad_node, pos) {
    const xmid = (quad_node.xmin + quad_node.xmax) / 2
    const ymid = (quad_node.ymin + quad_node.ymax) / 2

    if (pos.x <= xmid) {
        if (pos.y <= ymid) {
            return quad_node.nw
        } else {
            return quad_node.sw
        }
    } else {
        if (pos.y <= ymid) {
            return quad_node.ne
        } else {
            return quad_node.se
        }
    }
}

/**
    Calculate the repulsive force on a node using the quad-tree.
    @param {Node}         node
    @param {Quad_Tree_Node} quad_node
    @param {Graph}        g
    @param {number}       theta
    @returns {void}
*/
function compute_repulsive_force(node, quad_node, g, theta) {
    if (quad_node == null || quad_node.mass == 0) return

    const dx = (quad_node.com_x / quad_node.mass) - node.pos.x
    const dy = (quad_node.com_y / quad_node.mass) - node.pos.y
    const distance = Math.sqrt(dx * dx + dy * dy) + 0.1 // Avoid division by zero
    const size = quad_node.xmax - quad_node.xmin

    if ((quad_node.is_leaf && quad_node.node !== node) || (size / distance < theta)) {
        // Treat this quad_node as a single body
        const f = g.options.repel_strength * node.mass * quad_node.mass / (distance * distance)
        const fx = f * dx / distance
        const fy = f * dy / distance
        node.vel.x -= fx / node.mass
        node.vel.y -= fy / node.mass
    } else if (!quad_node.is_leaf) {
        // Recursively calculate force from child nodes
        compute_repulsive_force(node, quad_node.nw, g, theta)
        compute_repulsive_force(node, quad_node.ne, g, theta)
        compute_repulsive_force(node, quad_node.sw, g, theta)
        compute_repulsive_force(node, quad_node.se, g, theta)
    }
}
/**
 @param {Graph} g
 @param {number} [alpha]
 @returns {void} */
export function simulate(g, alpha = 1) {
	let {nodes, edges, options} = g

	// Build the quad-tree
    build_quad_tree(g)

	for (let node of nodes) {
		let {vel, pos} = node
		let {x, y} = pos

		/*
			towards the origin
		*/
		vel.x += (options.grid_size/2 - x) * options.origin_strength * alpha / node.mass
		vel.y += (options.grid_size/2 - y) * options.origin_strength * alpha / node.mass

        // Repulsive forces using quad-tree
        compute_repulsive_force(node, g.quad_tree, g, 0.6)
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
        if (!node.anchor && node.vel.x * node.vel.x + node.vel.y * node.vel.y > options.min_move) {
            node.pos.x += node.vel.x
            node.pos.y += node.vel.y

            // Clamp positions
            node.pos.x = math.clamp(node.pos.x, 0, g.max_pos)
            node.pos.y = math.clamp(node.pos.y, 0, g.max_pos)

            node.moved = true
        }

		/*
			inertia
		*/
		vel.x *= options.inertia_strength * alpha
		vel.y *= options.inertia_strength * alpha
	}
}
