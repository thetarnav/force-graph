/**
 @template T
 @typedef {import("./T.ts").Arraylike<T>} Arraylike
*/
/**
 @template T
 @typedef {import("./T.ts").Readonly_Arraylike<T>} Readonly_Arraylike
*/
/** @typedef {import("./T.ts").Num_Arraylike}          Num_Arraylike */
/** @typedef {import("./T.ts").Readonly_Num_Arraylike} Readonly_Num_Arraylike */

/** @typedef {import("./T.ts").Any_Arraylike}          Any_Arraylike */
/** @typedef {import("./T.ts").Readonly_Any_Arraylike} Readonly_Any_Arraylike */

/**
 @param {any[]} array 
 @param {number} idx 
*/
export function unordered_remove(array, idx) {
	[array[idx], array[array.length-1]] = [array[array.length-1], array[idx]]
	array.length -= 1
}
