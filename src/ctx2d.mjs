import * as la from "./linalg.mjs"

const Vec = la.Vec2
const vec = la.vec2
/** @typedef {la.Vec2} Vec */

const Rect = la.Rect
const rect = la.rect
/** @typedef {la.Rect} Rect */

/** @typedef {CanvasRenderingContext2D} Ctx2D */

/**
 * @param   {number} n
 * @returns {string} */
export function num_string(n) {
	let text = ""
	if (n < 0) {
		text += "-"
		n = -n
	} else {
		text += "+"
	}
	if (n < 10) {
		text += "0"
	}
	text += n.toFixed(2)
	return text
}

/**
 * @param   {Vec}   v
 * @returns {string} */
export function vec_string(v) {
	return `(${num_string(v.x)}; ${num_string(v.y)})`
}

/**
 * @param {Ctx2D}  ctx
 * @param {Rect}   rect
 * @param {number} r
 */
export function draw_rect_rounded(ctx, rect, r) {
	let {x, y, size: {x: w, y: h}} = rect
	ctx.beginPath()
	ctx.moveTo(x + r, y)
	ctx.arcTo(x+w, y  , x+w, y+h, r)
	ctx.arcTo(x+w, y+h, x  , y+h, r)
	ctx.arcTo(x  , y+h, x  , y  , r)
	ctx.arcTo(x  , y  , x+w, y  , r)
}

/**
 * @param {Ctx2D}  ctx
 * @param {Vec}    a
 * @param {Vec}    b
 * @param {number} dist
 */
export function draw_arc_between(ctx, a, b, dist) {
	let arc = la.arc_between(a, b, dist)
	ctx.beginPath()
	ctx.arc(arc.x, arc.y, arc.r, arc.start, arc.end)
}

/**
Assumes there is no rotaton!
@param   {Ctx2D} ctx 
@param   {Vec}   [margin] 
@returns {Rect}
*/
export function get_clip_rect(ctx, margin = la.VEC_ZERO) {
	let {width, height} = ctx.canvas
	let t = ctx.getTransform()
	let w = (-margin.x -t.e) / t.a
	let n = (-margin.y -t.f) / t.d
	let e = (width  + margin.x -t.e) / t.a
	let s = (height + margin.y -t.f) / t.d
	return {
		x: w, y: n,
		size: {x: e-w, y: s-n},
	}
}
