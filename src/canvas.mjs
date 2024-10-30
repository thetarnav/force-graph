import * as la    from "./linalg.mjs"
import * as math  from "./math.mjs"
import * as force from "./force.mjs"
import * as ctx2d from "./ctx2d.mjs"

const Vec = la.Vec2
const vec = la.vec2
/** @typedef {la.Vec2} Vec */

const Rect = la.Rect
const rect = la.rect
/** @typedef {la.Rect} Rect */

/** @typedef {CanvasRenderingContext2D} Ctx2D */

/** @typedef {"move" | "drag" | "pinch"} Pointer_Kind */

export class Canvas {

	/* config */
	drag_inertia     = 0.6
	drag_strength    = 0.25

	/* inputs */
	canvas_rect      = new Rect
	window_size      = new Vec
	pointers         = /** @type {PointerEvent[]} */([])
	space_down       = false
	wheel_delta      = 0
	
	/* state */
	pos              = new Vec
	
	scale            = 2
	scale_min        = 0
	scale_max        = 7

	hover_node       = /**@type {force.Node?}*/(null)

	/** @type {Record<Pointer_Kind, number>} */
	pointer_ids = {
		move:  0,
		drag:  0,
		pinch: 0,
	}
	
	pinch_init_ratio = 0
	pinch_init_scale = 0

	drag_node        = /**@type {force.Node?}*/(null)
	drag_vel         = new Vec

	move_init_pos    = new Vec
	
	constructor(
		/**@type {Ctx2D}*/       ctx,
		/**@type {force.Graph}*/ graph,
	) {
		this.ctx   = ctx
		this.graph = graph
	}
}

/**
 @param   {Canvas}       c 
 @param   {Pointer_Kind} kind
 @returns {PointerEvent?} */
function get_pointer(c, kind) {
	if (c.pointer_ids[kind] !== 0) {
		for (let p of c.pointers) {
			if (p.pointerId === c.pointer_ids[kind] && p.buttons > 0) {
				return p
			}
		}
		c.pointer_ids[kind] = 0
	}
	return null
}
/**
 @param   {Canvas} c
 @returns {PointerEvent?} */
function get_unassigned_pressed_pointer(c) {
	for (let p of c.pointers) {
		if (p.buttons > 0 && p.pointerId !== c.pointer_ids.drag &&
		                     p.pointerId !== c.pointer_ids.move &&
		                     p.pointerId !== c.pointer_ids.pinch) {
			return p
		}
	}
	return null
}

/**
 @param   {Ctx2D}       ctx 
 @param   {force.Graph} graph 
 @returns {Canvas}      */
export function make_canvas(ctx, graph) {
	return new Canvas(ctx, graph)
}

/**
 @param   {Canvas} c
 @returns {number} */
export function get_node_radius(c) {
	return 1/c.scale/2
}
/**
 @param   {Canvas} c
 @returns {number} */
export function get_pointer_node_radius(c) {
	let max_size = math.max(c.ctx.canvas.width, c.ctx.canvas.height)
	const margin = 8
	return ((get_node_radius(c) + margin) / max_size) * c.graph.options.grid_size
}
/**
 @param   {number} canvas_size 
 @param   {number} scale
 @returns {number} */
export function get_edge_width(canvas_size, scale) {
	return (canvas_size / 8000 / scale)
}
/**
 @param   {number} ar
 @returns {number} */
export function get_ar_margin(ar) {
	return (1 - math.min(1, ar)) / 2
}

/**
 @param   {Canvas} c
 @param   {Vec}    pos
 @returns {Vec}    */
export function pos_window_to_rvec(c, pos) {

	let ratio = la.vec_to_rvec_in_rect(c.canvas_rect, pos)
	let {width, height} = c.ctx.canvas

	/*
		correct for aspect ratio by shifting the shorter side's axis
	*/
	ratio.x = ratio.x * Math.min(1, width/height) + get_ar_margin(width/height)
	ratio.y = ratio.y * Math.min(1, height/width) + get_ar_margin(height/width)

	return ratio
}

/**
 @param   {Canvas} c
 @param   {Vec}    rvec
 @returns {Vec}    */
export function rvec_to_graph(c, rvec) {
	let grid_size = c.graph.options.grid_size

	let {x, y} = rvec

	/* to graph plane */
	x = x * grid_size/c.scale
	y = y * grid_size/c.scale

	/* correct for scale shifting the origin */
	x += grid_size/2 - grid_size/c.scale/2
	y += grid_size/2 - grid_size/c.scale/2

	/* add user position */
	x += c.pos.x
	y += c.pos.y

	return vec(x, y)
}

/**
 @param   {Canvas} c
 @param   {Vec}    pos
 @returns {Vec}    */
export function pos_window_to_graph(c, pos) {
	let ratio = pos_window_to_rvec(c, pos)
	return rvec_to_graph(c, ratio)
}

/**
 @param   {Canvas} c 
 @returns {Vec}    */
export function get_canvas_translate(c) {

	let {width, height} = c.ctx.canvas
	let max_size        = Math.max(width, height)
	let grid_size       = c.graph.options.grid_size

	/* origin (top-left corner) gets shifted away from the center */
	let x = (1-c.scale) * max_size / 2
	let y = (1-c.scale) * max_size / 2

	/* subtract user position (to move camera in the opposite direction) */
	x -= c.pos.x / grid_size * max_size * c.scale
	y -= c.pos.y / grid_size * max_size * c.scale

	/* correct for aspect ratio by shifting the shorter side's axis */
	x += -get_ar_margin(width/height) * max_size
	y += -get_ar_margin(height/width) * max_size

	return {x, y}
}

/**
 @param {Canvas} c 
 @param {number} x 
 @param {number} y 
*/
export function set_translate_xy(c, x, y) {

	let grid_size       = c.graph.options.grid_size
	let {width, height} = c.ctx.canvas

	let radius      = grid_size/2
	let ar_offset_x = get_ar_margin(width/height) * (grid_size/c.scale)
	let ar_offset_y = get_ar_margin(height/width) * (grid_size/c.scale)

	let min = radius/c.scale - radius
	let max = radius - radius/c.scale

	c.pos.x = math.clamp(x, min-ar_offset_x, max+ar_offset_x)
	c.pos.y = math.clamp(y, min-ar_offset_y, max+ar_offset_y)
}
/**
 @param {Canvas} c 
 @param {Vec}    t 
*/
export function set_translate(c, t) {
	set_translate_xy(c, t.x, t.y)
}
/**
 @param {Canvas} c
*/
export function update_translate(c) {
	set_translate(c, c.pos)
}

/**
 * @param   {Canvas} c  
 * @returns {void}   */
export function update_canvas_rect(c) {

	const rect = c.ctx.canvas.getBoundingClientRect()
	const dpr  = window.devicePixelRatio || 1
	
	c.ctx.canvas.width  = rect.width  * dpr
	c.ctx.canvas.height = rect.height * dpr

	c.canvas_rect.x      = rect.left
	c.canvas_rect.y      = rect.top
	c.canvas_rect.size.x = rect.width
	c.canvas_rect.size.y = rect.height
	c.window_size.x      = window.innerWidth
	c.window_size.y      = window.innerHeight
}

/**
 * @param   {Canvas} c
 * @returns {void}   */
export function update_canvas_gestures(c) {
	
	let hover_node_radius = get_pointer_node_radius(c)

	/*
	DRAG
	*/
	if (c.pointer_ids.drag === 0) {
		for (let p of c.pointers) {
			if (p.buttons === 0 || c.pointer_ids.move  === p.pointerId ||
			                       c.pointer_ids.pinch === p.pointerId)
				continue
			
			let cursor = pos_window_to_graph(c, la.vec_from_event_client(p))
			let node = force.find_closest_node_linear(c.graph, cursor, hover_node_radius)
			
			if (node) {
				c.drag_node        = node
				c.drag_node.anchor = true
				c.pointer_ids.drag = p.pointerId
			}
		}
	}

	if (c.pointer_ids.drag !== 0) {
		let p    = get_pointer(c, "drag")
		let node = /** @type {force.Node} */(c.drag_node)
	
		if (p) {
			let target = pos_window_to_graph(c, la.vec_from_event_client(p))
	
			c.drag_vel.x *= c.drag_inertia
			c.drag_vel.y *= c.drag_inertia
	
			c.drag_vel.x += (target.x-node.pos.x) * c.drag_strength
			c.drag_vel.y += (target.y-node.pos.y) * c.drag_strength
	
			force.set_position(c.graph, node, {
				x: node.pos.x + c.drag_vel.x,
				y: node.pos.y + c.drag_vel.y,
			})
		} else {
			node.anchor  = false
			c.drag_node  = null
			c.drag_vel.x = 0
			c.drag_vel.y = 0
		}
	}

	/*
	MOVE
	*/
	if (c.pointer_ids.move === 0) {
		let p = get_unassigned_pressed_pointer(c)
		if (p) {
			c.pointer_ids.move = p.pointerId
			c.move_init_pos    = pos_window_to_graph(c, la.vec_from_event_client(p))
		}
	}

	let move_p = get_pointer(c, "move")

	/*
	SELECT CURSOR POSITION
	*/
	let before = move_p !== null
		? c.move_init_pos
		: c.pointers.length > 0
			? pos_window_to_graph(c, la.vec_from_event_client(c.pointers[0]))
			: pos_window_to_graph(c, c.window_size)

	/*
	WHEEL SCROLLING
	*/
	if (c.wheel_delta !== 0) {
		/* smoothed - applied only a part of delta a frame */
		let delta_y = math.lerp(0, c.wheel_delta, 0.2)
		c.wheel_delta -= delta_y

		/*
		 Use a sine function slow down the zooming as it gets closer to min and max
		 y = sin(x • π) where x = current zoom % and y = delta multiplier
		 the current zoom need to be converted to % with a small offset
		 because sin(0) = sin(π) = 0 which would completely stop the zooming

		        _--_     <- fast
		      /     \\
		    /         \
		   |           \
		  |             \
		 |              \  <- slow
		MIN     mid     MAX
		*/
		let offset            = 1 / ((c.scale_max - 1) * 2)
		let scale_with_offset = math.map_range(c.scale, 1, c.scale_max, offset, 1 - offset)
		let zoom_mod          = math.sin(scale_with_offset * math.PI)

		c.scale += delta_y * zoom_mod * -0.005
	}

	/*
	MULTI TOUCH - PINCH SCALING
	*/
	let pinch_p = get_pointer(c, "pinch") ?? get_unassigned_pressed_pointer(c)
	if (move_p && pinch_p) {
		c.pointer_ids.pinch = pinch_p.pointerId

		let move_r  = pos_window_to_rvec(c, la.vec_from_event_client(move_p))
		let pinch_r = pos_window_to_rvec(c, la.vec_from_event_client(pinch_p))
		let ratio   = la.vec_distance(move_r, pinch_r)

		if (c.pinch_init_ratio !== 0) {
			c.scale = c.pinch_init_scale*(ratio/c.pinch_init_ratio)
		} else {
			c.pinch_init_ratio = ratio
			c.pinch_init_scale = c.scale
		}
	} else {
		c.pointer_ids.pinch = 0
		c.pinch_init_ratio  = 0
		c.pinch_init_scale  = 0
	}

	/*
	CLAMP TO LIMITS
	*/
	c.scale = math.clamp(c.scale, 1, c.scale_max)

	/*
	CORRECT CURSOR POSITION
	*/
	let after = move_p
		? pos_window_to_graph(c, la.vec_from_event_client(move_p))
		: c.pointers.length > 0
			? pos_window_to_graph(c, la.vec_from_event_client(c.pointers[0]))
			: pos_window_to_graph(c, c.window_size)

	set_translate_xy(c,
		c.pos.x - (after.x-before.x),
		c.pos.y - (after.y-before.y),
	)

	/*
	HOVER
	*/
	c.hover_node = null
	for (let p of c.pointers) {
		if (p.buttons === 0) {
			let pos = pos_window_to_graph(c, la.vec_from_event_client(p))
			c.hover_node = force.find_closest_node_linear(c.graph, pos, hover_node_radius)
			break
		}
	}
}

/**
 @param {Canvas} c 
*/
export function draw_reset(c) {

	let max_size = math.max(c.ctx.canvas.width, c.ctx.canvas.height)

	/* clear */
	c.ctx.resetTransform()
	c.ctx.clearRect(0, 0, max_size, max_size)

	let translate = get_canvas_translate(c)

	c.ctx.setTransform(c.scale, 0, 0, c.scale, translate.x, translate.y)
}

/**
 @param {Canvas} c 
*/
export function draw_edges(c) {

	let max_size  = math.max(c.ctx.canvas.width, c.ctx.canvas.height)
	let grid_size = c.graph.options.grid_size

	c.ctx.beginPath()
	c.ctx.lineWidth = get_edge_width(max_size, c.scale)
	c.ctx.strokeStyle = `rgb(150, 150, 150)`

	for (let {a, b} of c.graph.edges) {
		c.ctx.moveTo(a.pos.x / grid_size * max_size,
		             a.pos.y / grid_size * max_size)
		c.ctx.lineTo(b.pos.x / grid_size * max_size,
		             b.pos.y / grid_size * max_size)
	}
	
	c.ctx.stroke()
}

/**
 @param {Canvas} c
 @param {Vec}    [clip_margin]
*/
export function draw_nodes(c, clip_margin = {x: 100, y: 20}) {

	let max_size  = math.max(c.ctx.canvas.width, c.ctx.canvas.height)
	let grid_size = c.graph.options.grid_size
	let radius    = get_node_radius(c)

	let clip_rect = ctx2d.get_clip_rect(c.ctx, clip_margin)

	const COLOR_NORMAL = `rgb(248, 113, 113)`
	const COLOR_HOVER  = `rgb(129, 140, 248)`

	c.ctx.textAlign    = "center"
	c.ctx.textBaseline = "middle"
	c.ctx.fillStyle    = COLOR_NORMAL
	c.ctx.font         = `1px sans-serif`

	c.ctx.beginPath()

	for (let node of c.graph.nodes) {

		let x = node.pos.x / grid_size * max_size
		let y = node.pos.y / grid_size * max_size

		if (la.xy_in_rect(clip_rect, x, y)) {

			let s = max_size/200 + (((node.mass-1) / 5) * (max_size/100)) / c.scale

			/* HOVERED */
			if (node.anchor || c.hover_node === node) {
				s += (1 - c.scale/c.scale_max) * 10
				c.ctx.scale(s, s)
				c.ctx.fillStyle = COLOR_HOVER
				c.ctx.fillText(node.label, x/s, y/s)
				c.ctx.fillStyle = COLOR_NORMAL
				c.ctx.scale(1/s, 1/s)
			}
			// /* CLOSE */
			// else if ((c.scale/c.scale_max)*10 + node.mass*0.4 > 4) {
			// 	c.ctx.scale(s, s)
			// 	c.ctx.fillText(node.label, x/s, y/s)
			// 	c.ctx.scale(1/s, 1/s)
			// }
			/* FAR AWAY */
			else {
				c.ctx.moveTo(x, y)
				c.ctx.arc(x, y, radius*s, 0, math.TAU)
			}
		}
	}

	c.ctx.fill()
}

/**
 @param {Canvas} c
*/
export function draw_canvas_default(c) {
	draw_reset(c)
	draw_edges(c)
	draw_nodes(c)
}
