import * as fg   from "./src/force.js"
import * as fc   from "./src/canvas.js"
import * as la   from "./src/linalg.js"
import * as math from "./src/math.js"

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

	let last_interaction = Date.now()
	
	void requestAnimationFrame(prev_time => {
		// const target_fps = 60
		// const target_ms  = 1000/target_fps
		let limit_last_timestamp = prev_time

		function frame(/** @type {number} */ time) {
			let target_fps = 60/math.max((time-last_interaction-4000)/6000, 1)
			let target_ms  = 1000/target_fps

			let times = ((time - limit_last_timestamp) / target_ms)|0
			limit_last_timestamp += times * target_ms
			times *= math.min((60/target_fps)|0, 4)

			if (times > 0) {
	
				for (let i = 0; i < times; i++) {
					fg.simulate(g)
					fc.update_canvas_gestures(c)
				}
				
				fc.draw_canvas_default(c)
			}
			
			// prev_time = time
			void requestAnimationFrame(frame)
		}
		void requestAnimationFrame(frame)
	})
	
	fc.update_canvas_rect(c)
	window.addEventListener("resize", () => {
		fc.update_canvas_rect(c)
	})
	document.addEventListener("pointermove", e => {
		last_interaction = e.timeStamp
		c.mouse.x = e.clientX
		c.mouse.y = e.clientY
	})
	canvas_el.addEventListener("pointerdown", e => {
		last_interaction = e.timeStamp
		c.mouse_down = true
		c.mouse.x    = e.clientX
		c.mouse.y    = e.clientY
	})
	document.addEventListener("pointerup", e => {
		last_interaction = e.timeStamp
		c.mouse_down = false
		c.mouse.x    = e.clientX
		c.mouse.y    = e.clientY
	})
	canvas_el.addEventListener("wheel", e => {
		e.preventDefault()
		last_interaction = e.timeStamp
		c.mouse.x = e.clientX
		c.mouse.y = e.clientY
		c.wheel_delta += e.deltaY/2
	})
	canvas_el.addEventListener("click", e => {
		if (c.mode === fc.Mode.Drag) {
			console.log("click", c.drag_node)
		}
	})
	document.addEventListener("keydown", e => {
		last_interaction = e.timeStamp
		switch (e.key) {
		case " ": c.space_down = true ;break
		}
	})
	document.addEventListener("keyup", e => {
		last_interaction = e.timeStamp
		switch (e.key) {
		case " ": c.space_down = false ;break
		}
	})
	document.addEventListener("visibilitychange", e => {
		if (document.hidden) {
			last_interaction = 0
		} else {
			last_interaction = e.timeStamp
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