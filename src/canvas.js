import * as la    from "./linalg.js"
import * as math  from "./math.js"
import * as force from "./force.js"
import * as ctx2d from "./ctx2d.js"

const Vec = la.Vec2
const vec = la.vec2
/** @typedef {la.Vec2} Vec */

const Rect = la.Rect
const rect = la.rect
/** @typedef {la.Rect} Rect */

/** @typedef {CanvasRenderingContext2D} Ctx2D */

class Canvas {

	canvas_rect    = new Rect
	window_size    = new la.Size
	mouse          = new Vec
	mouse_down     = false
	/** @type {Vec | null} graph pos where the drag started */
	mouse_down_pos = null
	space_down     = false
	wheel_delta    = 0
	
	pos       = new Vec
	scale     = 2
	scale_min = 0
	scale_max = 7
	mode      = /**@type {Interaction_Mode}*/ (Interaction_Mode.Default)
	
	constructor(
		/**@type {Ctx2D}*/       ctx,
		/**@type {force.Graph}*/ graph,
	) {
		this.ctx   = ctx
		this.graph = graph
	}
}

/**
 @param   {Ctx2D}       ctx 
 @param   {force.Graph} graph 
 @returns {Canvas}      */
export function make_canvas(ctx, graph) {
	return new Canvas(ctx, graph)
}

/** @enum {typeof Interaction_Mode[keyof typeof Interaction_Mode]} */
export const Interaction_Mode = /** @type {const} */({
	Default:        0,
	NodeDrag:       1,
	MoveSpace:      2,
	MoveDrag:       3,
	MoveMultiTouch: 4,
})
/** @type {Record<Interaction_Mode, string>} */
export const interaction_mode_to_string_table = {
	[Interaction_Mode.Default]:        "Default",
	[Interaction_Mode.NodeDrag]:       "NodeDrag",
	[Interaction_Mode.MoveSpace]:      "MoveSpace",
	[Interaction_Mode.MoveDrag]:       "MoveDrag",
	[Interaction_Mode.MoveMultiTouch]: "MoveMultiTouch",
}
/**
 * @param   {Interaction_Mode} mode
 * @returns {string} */
export function interaction_mode_string(mode) {
	return interaction_mode_to_string_table[mode]
}

/**
 @param   {number} canvas_size 
 @returns {number} */
export function get_node_radius(canvas_size) {
	return canvas_size / 240
}
/**
 @param   {number} canvas_size 
 @param   {number} grid_size
 @returns {number} */
export function get_pointer_node_radius(canvas_size, grid_size) {
	const margin = 5
	return ((get_node_radius(canvas_size) + margin) / canvas_size) * grid_size
}
/**
 @param   {number} canvas_size 
 @param   {number} scale
 @returns {number} */
export function get_edge_width(canvas_size, scale) {
	return (canvas_size / 8000 / scale) * 3
}
/**
 @param   {number} ar
 @returns {number} */
export function get_ar_margin(ar) {
	return (1 - math.min(1, ar)) / 2
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

	c.canvas_rect.x = rect.left
	c.canvas_rect.y = rect.top
	c.canvas_rect.w = rect.width
	c.canvas_rect.h = rect.height
	c.window_size.w = window.innerWidth
	c.window_size.h = window.innerHeight
}

/**
 * @param   {Canvas} c 
 * @param   {number} dt 
 * @returns {void}   */
export function update_canvas_gestures(c, dt) {

	let is_mouse_in_canvas = la.vec_in_rect(c.canvas_rect, c.mouse)

	/** @type {Vec} Graph pos where the cursor should be */
	let anchor

	/*
	 MOVE
	*/
	if (c.mouse_down) {
		c.mouse_down_pos ||= pos_window_to_graph(c, c.mouse)
		anchor             = c.mouse_down_pos
	} else {
		c.mouse_down_pos   = null
		anchor             = pos_window_to_graph(c, c.mouse)
	}

	/*
	 SCROLL
	 smoothed - applied only a part of delta a frame
	*/
	if (c.wheel_delta) {
		let delta_y = math.exp_decay(0, c.wheel_delta, 0.2, dt)
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

		c.scale = math.clamp(c.scale + delta_y * zoom_mod * -0.005, 1, c.scale_max)
	}

	{ /* Make sure the anchor is under the cursor */
		let mouse_pos = pos_window_to_graph(c, c.mouse)
		set_translate_xy(c,
			c.pos.x - (mouse_pos.x-anchor.x),
			c.pos.y - (mouse_pos.y-anchor.y),
		)
	}



	// switch (c.mode) {
	// case Interaction_Mode.Move:
	// 	if (c.edit_down) {
	// 		c.mouse_prev = null
	// 		c.mode = Interaction_Mode.Edit
	// 		break
	// 	}

	// 	handle_move_camera(s)
	// 	break
	// case Interaction_Mode.Space:
	// 	if (!c.space_down) {
	// 		c.mouse_prev = null
	// 		c.mode = Interaction_Mode.Edit
	// 		break
	// 	}

	// 	handle_move_camera(s)
	// 	break
	// case Interaction_Mode.Edit:


	// 	break
	// case Interaction_Mode.Drag:


	// 	break
	// }

	// Camera

	// c.ctx.clearRect(0, 0, c.canvas_width * c.dpr, c.canvas_height * c.dpr)
	// c.ctx.translate(-c.camera_poc.x, -c.camera_poc.y)

	log_el.innerHTML = `
		mouse:       ${ctx2d.vec_string(c.mouse)}
		mouse_graph: ${ctx2d.vec_string(pos_window_to_graph(c, c.mouse))}
		wheel_delta: ${ctx2d.num_string(c.wheel_delta)}
	`
	
}

let log_el = document.body.appendChild(document.createElement("pre"))

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

	let edge_width = get_edge_width(max_size, c.scale)

	for (let {a, b} of c.graph.edges) {
		let opacity = 0.2 + ((a.mass + b.mass - 2) / 100) * 2 * c.scale

		c.ctx.strokeStyle = a.anchor || b.anchor || c.hovered_node === a || c.hovered_node === b
			? `rgba(129, 140, 248, ${opacity})`
			: `rgba(150, 150, 150, ${opacity})`
		c.ctx.lineWidth = edge_width
		c.ctx.beginPath()
		c.ctx.moveTo(a.pos.x / grid_size * max_size,
					 a.pos.y / grid_size * max_size)
		c.ctx.lineTo(b.pos.x / grid_size * max_size,
					 b.pos.y / grid_size * max_size)
		c.ctx.stroke()
	}
}

/**
 @param {Canvas} c 
*/
export function draw_nodes_dots(c) {

	let max_size  = math.max(c.ctx.canvas.width, c.ctx.canvas.height)
	let grid_size = c.graph.options.grid_size
	let radius    = get_node_radius(max_size)

	let clip_rect = ctx2d.get_clip_rect(c.ctx, {x: radius, y: radius})

	for (let node of c.graph.nodes) {

		let x = node.pos.x / grid_size * max_size
		let y = node.pos.y / grid_size * max_size

		if (la.xy_in_rect(clip_rect, x, y)) {

			let opacity = 0.6 + (node.mass / 10) * 4

			c.ctx.fillStyle = node.anchor || c.hovered_node === node
				? `rgba(129, 140, 248, ${opacity})`
				: `rgba(248, 113, 113, ${opacity})`
			c.ctx.beginPath()
			c.ctx.ellipse(
				x, y,
				radius, radius,
				0, 0,
				math.TAU,
			)
			c.ctx.fill()
		}
	}
}

/**
 @param {Canvas} c 
 @param {Vec}    [clip_margin]
*/
export function draw_nodes_text(c, clip_margin = {x: 100, y: 20}) {

	let max_size  = Math.max(c.ctx.canvas.width, c.ctx.canvas.height)
	let grid_size = c.graph.options.grid_size

	let clip_rect = ctx2d.get_clip_rect(c.ctx, clip_margin)

	c.ctx.textAlign    = "center"
	c.ctx.textBaseline = "middle"

	for (let node of c.graph.nodes) {

		let x = node.pos.x / grid_size * max_size
		let y = node.pos.y / grid_size * max_size

		if (la.xy_in_rect(clip_rect, x, y)) {

			c.ctx.font = `${max_size/200 + (((node.mass-1) / 5) * (max_size/100)) / c.scale}px sans-serif`

			let opacity = 0.6 + ((node.mass-1) / 50) * 4

			c.ctx.fillStyle = node.anchor || c.hovered_node === node
				? `rgba(129, 140, 248, ${opacity})`
				: `rgba(248, 113, 113, ${opacity})`

			c.ctx.fillText(node.label, x, y)
		}
	}
}

/**
 @param {Canvas} c
*/
export function draw_canvas_default(c) {
	draw_reset(c)
	draw_edges(c)
	draw_nodes_text(c)
}
