import * as fg from "./src/force.js"
import * as fc from "./src/canvas.js"
import * as la from "./src/linalg.js"

import raw_data from "./data.json" with {type: "json"}

/**
 @returns {fg.Graph}
*/
export function get_graph_from_data() {

	let entries  = Object.entries(raw_data)
	let node_map = /**@type {Map<string, fg.Node>}*/(new Map())

	let g = fg.make_graph(fg.DEFAULT_OPTIONS)

	/* NODES */
	for (let [key, raw] of entries) {

		let node = fg.make_node()
		node.key   = key
		node.label = raw.prettyName

		fg.add_node(g, node)
		node_map.set(key, node)
	}

	/* CONNECTIONS */
	for (let [key, raw] of entries) {
		let node = /** @type {fg.Node} */(node_map.get(key))

		for (let link_key of raw.connections) {
			let link_node = node_map.get(link_key)
			if (link_node) {
				fg.connect(g, node, link_node)
			}
		}
	}

	/* MASS */
	for (let node of g.nodes) {
		let edges = fg.get_node_edges(g, node)
		node.mass = fg.node_mass_from_edges(edges.length)
	}

	return g
}

function main() {
	const canvas_el = /** @type {HTMLCanvasElement} */ (document.getElementById("canvas"))

	const ctx = canvas_el.getContext("2d")
	if (ctx == null) {
		document.body.textContent = "Failed to get 2d context"
		throw new Error("Failed to get 2d context")
	}

	const g = get_graph_from_data()
	const c = fc.make_canvas(ctx, g)
	
	fg.set_positions_spread(g)

	// @ts-ignore
	window.state = c

	void requestAnimationFrame(prev_time => {
		function frame(/** @type {number} */ time) {
			fg.simulate(g)
			fc.update_canvas_gestures(c, time - prev_time)
			fc.draw_canvas_default(c)
			prev_time = time
			void requestAnimationFrame(frame)
		}
		void requestAnimationFrame(frame)
	})
	
	fc.update_canvas_rect(c)
	window.addEventListener("resize", () => {
		fc.update_canvas_rect(c)
	})

	document.addEventListener("pointermove", e => {
		c.mouse.x = e.clientX
		c.mouse.y = e.clientY
	})
	canvas_el.addEventListener("pointerdown", e => {
		c.mouse_down = true
		c.mouse.x    = e.clientX
		c.mouse.y    = e.clientY
	})
	document.addEventListener("pointerup", e => {
		c.mouse_down = false
		c.mouse.x    = e.clientX
		c.mouse.y    = e.clientY
	})
	canvas_el.addEventListener("wheel", e => {
		e.preventDefault()

		c.mouse.x = e.clientX
		c.mouse.y = e.clientY

		c.wheel_delta += e.deltaY/2
	})
	document.addEventListener("keydown", e => {
		switch (e.key) {
		case " ": c.space_down = true ;break
		}
	})
	document.addEventListener("keyup", e => {
		switch (e.key) {
		case " ": c.space_down = false ;break
		}
	})

	/*

	prevent scrolling on touch devices

	*/

	/**
	 * @param   {Event} e 
	 * @returns {void}  */
	function preventCancelable(e) {
		if (e.cancelable) e.preventDefault()
	}
	const NOT_PASSIVE = {passive: false}

	canvas_el.addEventListener("touchstart", preventCancelable, NOT_PASSIVE)
	canvas_el.addEventListener("touchmove" , preventCancelable, NOT_PASSIVE)
}
main()