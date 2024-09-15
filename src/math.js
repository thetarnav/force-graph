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

/**
 @param   {number} a 
 @param   {number} b 
 @returns {number} */
export function remainder(a, b) {
	return ((a % b) + b) % b
}
/**
 @param   {number} value 
 @param   {number} min 
 @param   {number} max 
 @returns {number} */
export function wrap(value, min, max) {
	return remainder(value - min, max - min) + min
}
/**
 @param   {number} value 
 @param   {number} min 
 @param   {number} max 
 @returns {number} */
export function bounce(value, min, max) {
	let range    = max - min
	let rem      = wrap(value - min, 0, 2 * range)
	let distance = abs(rem - range)
	return max - distance
}

/**
 @param   {number} max exclusive
 @returns {number} */
export function random_to(max) {
	return random() * max
}
/**
 @param   {number} min inclusive
 @param   {number} max exclusive
 @returns {number} */
export function random_from_to(min, max) {
	return random() * (max - min) + min
}
/**
 @param   {number} max exclusive
 @returns {number} */
 export function random_int_to(max) {
	return floor(random() * max)
}
/**
 @param   {number} min inclusive
 @param   {number} max exclusive
 @returns {number} */
export function random_int_from_to(min, max) {
	return floor(random() * (max - min)) + min
}

/**
 @param   {number} value
 @param   {number} min inclusive
 @param   {number} max inclusive
 @returns {number} */
export function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max)
}

/**
 @param   {number} a
 @param   {number} b
 @param   {number} t
 @returns {number} */
export function lerp(a, b, t) {
	return a + (b-a) * t
}

const DT_FIXED = 16.666666666666668

/**
 @param   {number} a
 @param   {number} b
 @param   {number} decay
 @param   {number} [dt]
 @returns {number} */
export function exp_decay(a, b, decay, dt = DT_FIXED) {
	return b + (a-b) * exp(-decay * (dt/DT_FIXED))
}

/**
 @param   {number} a
 @param   {number} b
 @param   {number} max_delta
 @returns {number} */
export function move_towards(a, b, max_delta) {
	let d = b - a
	return a + sign(d) * min(abs(d), max_delta)
}

/**
 @param   {number}  value 
 @param   {number}  min inclusive
 @param   {number}  max exclusive
 @returns {boolean} */
export function in_range(value, min, max) {
	return value >= min && value < max
}

/**
 For finding `b` in `[a, b)` ranges.
 Because sometimes `n - Number.EPSILON == n`
 @param   {number} max b
 @returns {number} */
export function find_open_upper_bound(max) {
	let m = 0, n = max
	while (max === n) 
		n = max - Number.EPSILON * (++m)
	return n
}
