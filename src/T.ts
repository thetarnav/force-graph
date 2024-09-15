export interface Arraylike<T> {
	readonly length: number
	readonly [Symbol.iterator]: () => IterableIterator<number>
	[index: number]: T
}
export interface Readonly_Arraylike<T> {
	readonly length: number
	readonly [Symbol.iterator]: () => IterableIterator<number>
	readonly [index: number]: T
}
export type Num_Arraylike          = Arraylike<number>
export type Readonly_Num_Arraylike = Readonly_Arraylike<number>

export type Any_Arraylike          = Arraylike<any>
export type Readonly_Any_Arraylike = Readonly_Arraylike<any>
