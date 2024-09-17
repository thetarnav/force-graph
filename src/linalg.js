import * as math from "./math.js"

export const TAU    = 6.283185307179586
export const PI     = Math.PI
export const SQRT2  = Math.SQRT2

export const max    = Math.max
export const min    = Math.min
export const abs    = Math.abs
export const sign   = Math.sign
export const sin    = Math.sin
export const asin   = Math.asin
export const cos    = Math.cos
export const atan2  = Math.atan2
export const sqrt   = Math.sqrt
export const floor  = Math.floor
export const ceil   = Math.ceil
export const round  = Math.round
export const random = Math.random
export const pow    = Math.pow
export const hypot  = Math.hypot
export const exp    = Math.exp

export class Vec2 {
	x = 0
	y = 0
}
/**
 @param   {number} x 
 @param   {number} y 
 @returns {Vec2} */
export function vec2(x, y) {
	var v = new Vec2()
	v.x = x
	v.y = y
	return v
}
/**
 @param   {Vec2} v
 @returns {Vec2} */
export function vec_copy(v) {
	return vec2(v.x, v.y)
}
/**
 @param   {Vec2} dst
 @param   {Vec2} src
 @returns {void} */
export function vec_set(dst, src) {
	dst.x = src.x
	dst.y = src.y
}
/**
 @param   {Vec2} a
 @param   {Vec2} b
 @returns {boolean} */
 export function vec_equals(a, b) {
	return a === b || (a.x === b.x && a.y === b.y)
}

export const VEC_ZERO = new Vec2

/**
 @param   {number} x 
 @param   {number} y 
 @returns {number} */
export function xy_hash(x, y) {
    return (x*73856093) ^ (y*19349663)
}
/**
 @param   {Vec2}   vec 
 @returns {number} */
export function vec_hash(vec) {
    return (vec.x*73856093) ^ (vec.y*19349663)
}

/**
 @param   {Vec2} a
 @param   {Vec2} b
 @returns {void} */
export function vec_add(a, b) {
	a.x += b.x
	a.y += b.y
}
/**
 @param   {Vec2} a
 @param   {Vec2} b
 @returns {Vec2} */
export function vec_sum(a, b) {
	return vec2(a.x + b.x, a.y + b.y)
}
/**
 @param   {Vec2} a
 @param   {number} b
 @returns {void} */
export function vec_add_scalar(a, b) {
	a.x += b
	a.y += b
}
/**
 @param   {Vec2} a
 @param   {number} b
 @returns {Vec2} */
export function vec_sum_scalar(a, b) {
	return vec2(a.x + b, a.y + b)
}
/**
 @param   {Vec2} a
 @param   {Vec2} b
 @returns {void} */
export function vec_sub(a, b) {
	a.x -= b.x
	a.y -= b.y
}
/**
 @param   {Vec2} a
 @param   {Vec2} b
 @returns {Vec2} */
export function vec_diff(a, b) {
	return vec2(a.x - b.x, a.y - b.y)
}
/**
 @param   {Vec2}   a
 @param   {number} b
 @returns {void}   */
export function vec_sub_scalar(a, b) {
	a.x -= b
	a.y -= b
}
/**
 @param   {Vec2}   a
 @param   {number} b
 @returns {Vec2}   */
export function vec_diff_scalar(a, b) {
	return vec2(a.x - b, a.y - b)
}
/**
 @param   {Vec2} a
 @param   {Vec2} b
 @returns {void} */
export function vec_mul(a, b) {
	a.x *= b.x
	a.y *= b.y
}
/**
 @param   {Vec2} a
 @param   {Vec2} b
 @returns {Vec2} */
export function vec_prod(a, b) {
	return vec2(a.x * b.x, a.y * b.y)
}
/**
 @param   {Vec2}   a
 @param   {number} b
 @returns {void} */
export function vec_mul_scalar(a, b) {
	a.x *= b
	a.y *= b
}
/**
 @param   {Vec2}   a
 @param   {number} b
 @returns {Vec2}   */
export function vec_prod_scalar(a, b) {
	return vec2(a.x * b, a.y * b)
}
/**
 @param   {Vec2} a
 @param   {Vec2} b
 @returns {void} */
export function vec_div(a, b) {
	a.x /= b.x
	a.y /= b.y
}
/**
 @param   {Vec2} a
 @param   {Vec2} b
 @returns {Vec2} */
export function vec_quotient(a, b) {
	return vec2(a.x / b.x, a.y / b.y)
}
/**
 @param   {Vec2} v
 @returns {void} */
export function vec_negate(v) {
	v.x = -v.x
	v.y = -v.y
}
/**
 @param   {Vec2} v
 @returns {void} */
export function vec_abs(v) {
	v.x = abs(v.x)
	v.y = abs(v.y)
}
/**
 @param   {number}   ax
 @param   {number}   ay
 @param   {number}   bx
 @param   {number}   by
 @returns {number} */
export function xy_distance(ax, ay, bx, by) {
	return Math.hypot(ax-bx, ay-by)
}
/**
 @param   {Vec2}   a
 @param   {Vec2}   b
 @returns {number} */
export function vec_distance(a, b) {
	return hypot(a.x - b.x, a.y - b.y)
}
/**
 @param   {Vec2}   a
 @param   {Vec2}   b
 @returns {number} */
export function vec_angle(a, b) {
	return atan2(b.y - a.y, b.x - a.x)
}
/**
 @param   {Vec2}   v
 @param   {number} angle
 @param   {number} dist
 @returns {void}   */
export function vec_move(v, angle, dist) {
	v.x += cos(angle) * dist
	v.y += sin(angle) * dist
}
/**
 @param   {Vec2}   v
 @param   {number} angle
 @param   {number} dist
 @returns {Vec2}   */
export function vec_moved(v, angle, dist) {
	return vec2(v.x + cos(angle) * dist, v.y + sin(angle) * dist)
}
/**
 @param   {Vec2} v
 @returns {void} */
export function vec_normalize(v) {
	let len = hypot(v.x, v.y)
	if (len !== 0) {
		v.x /= len
		v.y /= len
	}
}
/**
 @param   {Vec2} v
 @returns {Vec2} */
export function vec_normalized(v) {
	let len = hypot(v.x, v.y)
	if (len !== 0) {
		return vec2(v.x / len, v.y / len)
	}
	return new Vec2()
}
/**
 @param   {Vec2}   a receiving
 @param   {Vec2}   b
 @param   {number} t
 @returns {void}   */
export function vec_lerp(a, b, t) {
	a.x = math.lerp(a.x, b.x, t)
	a.y = math.lerp(a.y, b.y, t)
}
/**
 @param   {Vec2}   a receiving
 @param   {Vec2}   b
 @param   {number} decay
 @param   {number} [dt]
 @returns {void}   */
export function vec_exp_decay(a, b, decay, dt) {
	a.x = math.exp_decay(a.x, b.x, decay, dt)
	a.y = math.exp_decay(a.y, b.y, decay, dt)
}
/**
 @param   {Vec2}   a
 @param   {Vec2}   b
 @returns {number} */
export function cross(a, b) {
	return a.x * b.y - a.y * b.x
}

export class Circle extends Vec2 {
	r = 0
}

/**
 @param   {number} radius 
 @returns {number}
*/
export function circumference(radius) {
    return TAU*radius
}

export class Arc extends Circle {
	start = 0
	end   = 0
}
/** 
 @param   {number} x
 @param   {number} y
 @param   {number} r
 @param   {number} start
 @param   {number} end
 @returns {Arc} */
export function arc(x, y, r, start, end) {
	let a   = new Arc()
	a.x     = x
	a.y     = y
	a.r     = r
	a.start = start
	a.end   = end
	return a
}

export class Size {
	w = 0
	h = 0
}

export class Rect extends Vec2 {
	w = 0
	h = 0
}
/**
 @param   {number} x
 @param   {number} y
 @param   {number} w
 @param   {number} h
 @returns {Rect}   */
export function rect(x, y, w, h) {
	let r = new Rect()
	r.x = x
	r.y = y
	r.w = w
	r.h = h
	return r
}

/**
 @param   {Rect}    rect
 @param   {Vec2}    point
 @returns {boolean} */
export function vec_in_rect(rect, point) {
	return xy_in_rect(rect, point.x, point.y)
}
/**
 @param   {Rect}    rect
 @param   {number}  x
 @param   {number}  y
 @returns {boolean} */
 export function xy_in_rect(rect, x, y) {
	return x >= rect.x && x < rect.x+rect.w &&
	       y >= rect.y && y < rect.y+rect.h
}

/**
 @param   {Rect} rect
 @param   {Vec2} vec
 @returns {Vec2} */
 export function vec_to_rvec_in_rect(rect, vec) {
	return xy_to_rvec_in_rect(rect, vec.x, vec.y)
}
/**
 @param   {Rect}   rect
 @param   {number} x
 @param   {number} y
 @returns {Vec2}   */
export function xy_to_rvec_in_rect(rect, x, y) {
	return vec2(
		(x - rect.x) / rect.w,
		(y - rect.y) / rect.h,
	)
}

/**
 @param   {Vec2}   start
 @param   {Vec2}   ctrl_1
 @param   {Vec2}   ctrl_2
 @param   {Vec2}   end
 @param   {number} t
 @returns {Vec2}   */
export function get_bezier_point(start, ctrl_1, ctrl_2, end, t) {
	let u = 1 - t
    return vec2(
		(u*u*u * start.x) + (3 * u*u*t * ctrl_1.x) + (3 * u*t*t * ctrl_2.x) + (t*t*t * end.x),
		(u*u*u * start.y) + (3 * u*u*t * ctrl_1.y) + (3 * u*t*t * ctrl_2.y) + (t*t*t * end.y),
	)
}

/**
 @param   {Vec2}    p1
 @param   {Vec2}    p2
 @param   {Vec2}    p3
 @param   {Vec2}    p4
 @returns {boolean} */
export function segments_intersecting(p1, p2, p3, p4) {
	let d1 = cross(vec_diff(p1, p3), vec_diff(p4, p3))
	let d2 = cross(vec_diff(p2, p3), vec_diff(p4, p3))
	let d3 = cross(vec_diff(p3, p1), vec_diff(p2, p1))
	let d4 = cross(vec_diff(p4, p1), vec_diff(p2, p1))

    // if the cross products have different signs, the segments intersect
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/**
 @param   {Vec2}   a
 @param   {Vec2}   b
 @param   {Vec2}   c
 @returns {number} */
export function angle_triangle(a, b, c) {
	let angle = atan2(c.y - b.y, c.x - b.x) - atan2(a.y - b.y, a.x - b.x)
	// ensure the angle is between 0 and 2π
	if (angle < 0) {
		angle += TAU
	}
	// Ensure the angle is no more than π
	if (angle > PI) {
		angle -= TAU
	}
	return angle
}

/**
 @param   {number} angle 
 @returns {number} */
export function angle_normalized(angle) {
	return ((angle % TAU) + TAU) % TAU
}

/**
 @param   {number}  angle 
 @param   {number}  start 
 @param   {number}  end 
 @returns {boolean} */
export function angle_in_range(angle, start, end) {
    angle = angle_normalized(angle)
    start = angle_normalized(start)
    end   = angle_normalized(end)

	return start < end
		? start <= angle && angle <= end
		: start <= angle || angle <= end
}

/**
 @param   {number} rad
 @returns {number} */
export function rad_to_deg(rad) {
	return rad * 180 / PI
}

/**
 @param   {number} angle
 @returns {string} */
export function angle_to_string(angle) {
	return `${rad_to_deg(angle).toFixed(2)}°`
}

/**
 This checks intersection of a segment with an arc.               \
 But the arc has to be larger than the segment.                   \
 The segment can cross the arc from the inside,                   \
 or from the outside.                                             \
 But the circle making the arc, cannot be impaled by the segment.
 
 @param   {Arc}     arc
 @param   {Vec2}    start
 @param   {Vec2}    end
 @returns {boolean} */
export function arc_segment_intersecting(arc, start, end) {
	let dist_start = vec_distance(start, arc)
	let dist_end   = vec_distance(end, arc)

	let crossing = (dist_start <  arc.r && dist_end >= arc.r) ||
	               (dist_start >= arc.r && dist_end <  arc.r)

	if (!crossing) return false

	let angle_start = vec_angle(arc, start)
	let angle_end   = vec_angle(arc, end)

	return angle_in_range(angle_start, arc.start, arc.end) ||
	       angle_in_range(angle_end,   arc.start, arc.end)
}

/**
 @param   {Circle} circle
 @param   {Vec2}   start
 @param   {Vec2}   end
 @returns {Vec2[]} zero, one or two points */
export function circle_segment_intersections(circle, start, end) {
    let v1x = end.x   - start.x
    let v1y = end.y   - start.y
    let v2x = start.x - circle.x
    let v2y = start.y - circle.y

    let b = -2 * (v1x * v2x + v1y * v2y)
    let c =  2 * (v1x * v1x + v1y * v1y)
    let d = sqrt(b * b - 2 * c * (v2x * v2x + v2y * v2y - circle.r * circle.r))

    if (isNaN(d)) { // no intercept
        return []
    }

	// these represent the unit distance of point one and two on the line
    let u1 = (b - d) / c
    let u2 = (b + d) / c

	/** @type {Vec2[]} */
	let points = []
	
    if (u1 <= 1 && u1 >= 0) {
		points.push(vec2(start.x + v1x * u1, start.y + v1y * u1))
    }
    if (u2 <= 1 && u2 >= 0) {
		points.push(vec2(start.x + v1x * u2, start.y + v1y * u2))
    }       

    return points
}

/**
 @param   {Arc}  arc
 @param   {Vec2} start
 @param   {Vec2} end
 @returns {Vec2 | null} */
export function arc_segment_intersection(arc, start, end) {
    let v1x = end.x   - start.x
    let v1y = end.y   - start.y
    let v2x = start.x - arc.x
    let v2y = start.y - arc.y

    let b = -2 * (v1x * v2x + v1y * v2y)
    let c =  2 * (v1x * v1x + v1y * v1y)
    let d = sqrt(b * b - 2 * c * (v2x * v2x + v2y * v2y - arc.r * arc.r))

    if (isNaN(d)) { // no intercept
        return null
    }

	// these represent the unit distance of point one and two on the line
    let u1 = (b - d) / c
    let u2 = (b + d) / c

	let p = new Vec2()
	let angle = 0
	
    if (u1 <= 1 && u1 >= 0) {
		p.x = start.x + v1x * u1
		p.y = start.y + v1y * u1
		angle = vec_angle(arc, p)
		if (angle_in_range(angle, arc.start, arc.end)) {
			return p
		}
    }
    if (u2 <= 1 && u2 >= 0) {
		p.x = start.x + v1x * u2
		p.y = start.y + v1y * u2
		angle = vec_angle(arc, p)
		if (angle_in_range(angle, arc.start, arc.end)) {
			return p
		}
    }       

    return null
}

/**
 @param   {Arc}    arc
 @param   {Circle} circle
 @returns {boolean} */
export function arc_circle_intersecting(arc, circle) {
	
    let dist = vec_distance(circle, arc)

	// if the circle is completely inside or outside the arc
    if (dist < arc.r - circle.r || dist > arc.r + circle.r) {
		return false
    }

	let start = arc.start % TAU
	let end   = arc.end   % TAU

    let start_x = arc.x + arc.r * cos(start)
    let start_y = arc.y + arc.r * sin(start)
    let end_x   = arc.x + arc.r * cos(end)
    let end_y   = arc.y + arc.r * sin(end)

	let diff_start_x = start_x - circle.x
	let diff_start_y = start_y - circle.y
	let diff_end_x   = end_x   - circle.x
	let diff_end_y   = end_y   - circle.y

    return (diff_start_x * diff_start_x + diff_start_y * diff_start_y <= circle.r * circle.r) ||
           (diff_end_x   * diff_end_x   + diff_end_y   * diff_end_y   <= circle.r * circle.r)
}

/**
 @param   {Circle} A
 @param   {Circle} B
 @returns {[Vec2, Vec2] | null} */
export function circle_circle_intersections(A, B) {
	let dx = B.x - A.x
	let dy = B.y - A.y
	let d  = hypot(dx, dy)

	if (
		d > (A.r + B.r) || // circles do not intersect
		d < abs(A.r - B.r) // one circle is contained in the other
	) {
		return null
	}

	/*
	C is the point where the line through the circle
	intersection points crosses the line between the circle
	centers.
	*/

	// the distance from A to C
	let c = (A.r*A.r - B.r*B.r + d*d) / (2*d)

	// coordinates of C
	let cx = A.x + dx * c/d
	let cy = A.y + dy * c/d

	// the distance from C to either of the intersection points
	let h = sqrt(A.r*A.r - c*c)

	// the offsets of the intersection points from C
	let rx = -dy * (h/d)
	let ry =  dx * (h/d)

	return [
		vec2(cx + rx, cy + ry),
		vec2(cx - rx, cy - ry),
	]
}

/**
 @param   {Arc} a
 @param   {Arc} b
 @returns {Vec2 | null} */
export function arc_arc_intersection(a, b) {

	let points = circle_circle_intersections(a, b)
	if (points) {
		if (angle_in_range(vec_angle(a, points[0]), a.start, a.end) && angle_in_range(vec_angle(b, points[0]), b.start, b.end)) {
			return points[0]
		}
		if (angle_in_range(vec_angle(a, points[1]), a.start, a.end) && angle_in_range(vec_angle(b, points[1]), b.start, b.end)) {
			return points[1]
		}
	}
	
	return null
}

/**
 @param   {Arc}  arc
 @param   {Rect} rect
 @returns {Vec2 | null} */
export function arc_rect_intersection(arc, rect) {
	return (
	/* N */ arc_segment_intersection(arc, vec2(rect.x,        rect.y),        vec2(rect.x+rect.w, rect.y))        ||
	/* E */ arc_segment_intersection(arc, vec2(rect.x+rect.w, rect.y),        vec2(rect.x+rect.w, rect.y+rect.h)) ||
	/* S */ arc_segment_intersection(arc, vec2(rect.x+rect.w, rect.y+rect.h), vec2(rect.x,        rect.y+rect.h)) ||
	/* W */ arc_segment_intersection(arc, vec2(rect.x,        rect.y+rect.h), vec2(rect.x,        rect.y))
	)
}

/**
 @param   {Arc}    a
 @param   {Rect}   rect
 @param   {number} radius
 @returns {Vec2 | null} */
export function arc_rect_rounded_intersection(a, rect, radius) {
	return (
	/* N  */ arc_segment_intersection(a, vec2(rect.x+radius, rect.y),        vec2(rect.x+rect.w-radius, rect.y))               ||
	/* E  */ arc_segment_intersection(a, vec2(rect.x+rect.w, rect.y+radius), vec2(rect.x+rect.w       , rect.y+rect.h-radius)) ||
	/* S  */ arc_segment_intersection(a, vec2(rect.x+radius, rect.y+rect.h), vec2(rect.x+rect.w-radius, rect.y+rect.h))        ||
	/* W  */ arc_segment_intersection(a, vec2(rect.x       , rect.y+radius), vec2(rect.x              , rect.y+rect.h-radius)) ||
	/* NW */ arc_arc_intersection(a, arc(rect.x+radius,        rect.y+radius,        radius, PI,      PI+PI/2)) ||
	/* NE */ arc_arc_intersection(a, arc(rect.x+rect.w-radius, rect.y+radius,        radius, PI+PI/2, 0))       ||
	/* SE */ arc_arc_intersection(a, arc(rect.x+rect.w-radius, rect.y+rect.h-radius, radius, 0,       PI/2))    ||
	/* SW */ arc_arc_intersection(a, arc(rect.x+radius,        rect.y+rect.h-radius, radius, PI/2,    PI))
	)
}

/**
 @param   {Vec2}   a
 @param   {Vec2}   b
 @param   {number} dist
 @returns {Arc}    */
export function arc_between(a, b, dist) {

	let arc = new Arc()

	if (dist === 0) {
		arc.x     = (a.x + b.x) / 2
		arc.y     = (a.y + b.y) / 2
		arc.r     = vec_distance(a, b) / 2
		arc.start = atan2(b.y - a.y, b.x - a.x)
		arc.end   = arc.start + PI
		return arc
	}
	
	if (dist < 0) {
		[a, b] = [b, a]
		dist   = -dist
	} 
	
	let lx    = b.x - a.x
	let ly    = b.y - a.y
	let l     = hypot(lx, ly)
	let mid   = vec2(a.x + lx/2, a.y + ly/2)
	let angle = atan2(ly, lx)
	let moved = vec_moved(mid, angle - PI/2, dist)
	let r     = vec_distance(a, moved)
	let swap  = asin(l / (2*r))

	arc.x     = moved.x
	arc.y     = moved.y
	arc.r     = r
	arc.start = angle + PI/2 - swap
	arc.end   = angle + PI/2 + swap
	return arc
}

/**
 @param   {number} radius
 @param   {number} w_original
 @param   {number} w_scaled
 @returns {number} */
export function scale_border_radius(radius, w_original, w_scaled) {
	return (w_scaled - (w_original - radius * 2)) / 2
}
