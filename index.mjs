import * as fg    from './src/force.mjs'
import * as fc    from './src/canvas.mjs'
import * as la    from './src/linalg.mjs'
import * as math  from './src/math.mjs'
import * as ctx2d from './src/ctx2d.mjs'

import raw_data_la    from './data_la.json'    with {type: 'json'}
import raw_data_repos from './data_repos.json' with {type: 'json'}

/**
 @returns {fg.Graph}
*/
export function get_graph_from_data_la() {

	let entries  = Object.entries(raw_data_la)
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

/**
 @returns {fg.Graph}
*/
export function get_graph_from_data_repos() {

	/**
	@typedef  {object} Mode_Map_Entry
	@property {fg.Node}                         node
	@property {number}                          edges
	@property {(typeof raw_data_repos)[number]} repo
	*/

	let node_map = /**@type {Map<string, Mode_Map_Entry>}*/(new Map())

	let g = fg.make_graph({
		inertia_strength: 0.7,
		repel_strength:   0.4,
		repel_distance:   40,
		link_strength:    0.015,
		origin_strength:  0.001,
		min_move:         0.001,
		grid_size:        500,
	})

	let max_stars = 1

	/* NODES */
	for (let repo of raw_data_repos) {

		let node = fg.make_node()
		node.key   = repo.name
		node.label = repo.name

		fg.add_node(g, node)
		node_map.set(repo.name, {node, repo, edges: 0})

		if (max_stars < repo.stars) {
			max_stars = repo.stars
		}
	}

	/* CONNECTIONS */
	for (let entry of node_map.values()) {
		for (let link_name of entry.repo.deps) {
			let link_entry = node_map.get(link_name)
			if (link_entry) {
				fg.connect(g, entry.node, link_entry.node)
				link_entry.edges += 1
			}
		}
	}

	/* MASS */
	for (let entry of node_map.values()) {
		let mass_from_stars = entry.repo.stars/max_stars
		let mass_from_edges = fg.node_mass_from_edges(entry.edges)
		entry.node.mass = 6*mass_from_stars + mass_from_edges/2
	}

	return g
}


let log_el = document.body.appendChild(document.createElement('pre'))
log_el.style.position      = 'fixed'
log_el.style.top           = '10px'
log_el.style.left          = '10px'
log_el.style.pointerEvents = 'none'

const canvas_el = /** @type {HTMLCanvasElement} */ (document.getElementById('canvas'))

const ctx = canvas_el.getContext('2d')
if (ctx == null) {
	document.body.textContent = 'Failed to get 2d context'
	throw new Error('Failed to get 2d context')
}

// const g = get_graph_from_data_la()
const g = get_graph_from_data_repos()
const c = fc.make_canvas(ctx, g)

// fg.set_positions_smart(g)
// fg.set_positions_spread(g)
fg.set_positions_random(g)

// @ts-ignore
window.state = c


let last_time_interaction = Date.now()
let last_time_frame       = 0
let last_time_limit       = 0
let initial_time          = 0

requestAnimationFrame(time => {
	last_time_frame = time
	last_time_limit = time
	initial_time    = time
	frame(time)
})

function frame(/** @type {number} */ time) {

	let delta_time_frame       = time-last_time_frame
	let delta_time_limit       = time-last_time_limit
	let delta_time_interaction = time-last_time_interaction

	let target_fps = 60/math.max((delta_time_interaction-4000)/6000, 1)
	let target_ms  = 1000/target_fps

	// slow down the simulation initially
	let alpha = Math.min(1, (time +1000 -initial_time) / 3000)

	let times = (delta_time_limit/target_ms)|0
	times *= (60/target_fps)|0
	times = math.min(times, 1 + (alpha*2)|0)

	last_time_limit += times * target_ms
	last_time_frame = time

	if (times > 0) {
		for (let i = 0; i < times; i++) {
			fg.simulate(g, alpha)
			fc.update_canvas_gestures(c)
		}
		
		fc.draw_canvas_default(c)
	}

	log_el.innerHTML = 
		`fps         = ${ctx2d.num_string(1000/delta_time_frame)}\n`+
		`target_fps  = ${ctx2d.num_string(target_fps)}\n`+
		`pointers    = ${c.pointers.map((e, i) => (
			(i > 0 ? '\n              ' : '') +
			`(${e.pointerId}, ${e.buttons}, ${ctx2d.vec_string(fc.pos_window_to_graph(c, la.vec_from_event_client(e)))})`
		))}\n`+
		`wheel_delta = ${ctx2d.num_string(c.wheel_delta)}\n`+
		`scale       = ${ctx2d.num_string(c.scale)}\n`+
		`pos         = ${ctx2d.vec_string(c.pos)}`
	
	
	requestAnimationFrame(frame)
}


fc.update_canvas_rect(c)
window.addEventListener('resize', () => {
	fc.update_canvas_rect(c)
})


/** @param {PointerEvent} e */
function upsert_pointer(e) {
	last_time_interaction = e.timeStamp

	for (let i = 0; i < c.pointers.length; i++) {
		let p = c.pointers[i]
		if (p.pointerId === e.pointerId) {
			c.pointers[i] = e
			return
		}
	}
	c.pointers.push(e)
}
/** @param {PointerEvent} e */
function remove_pointer(e) {
	last_time_interaction = e.timeStamp

	for (let i = 0; i < c.pointers.length; i++) {
		if (c.pointers[i].pointerId === e.pointerId) {
			c.pointers.splice(i, 1)
			return
		}
	}
}
document.addEventListener('pointermove', upsert_pointer)
canvas_el.addEventListener('pointerdown', upsert_pointer)
document.addEventListener('pointerup', e => {
	if (e.pointerType === 'touch') {
		remove_pointer(e)
	} else {
		upsert_pointer(e)
	}
})
document.addEventListener('pointerleave', remove_pointer)
document.addEventListener('pointercancel', remove_pointer)

canvas_el.addEventListener('wheel', e => {
	e.preventDefault()
	last_time_interaction = e.timeStamp
	c.wheel_delta   += e.deltaY/2
})
canvas_el.addEventListener('click', e => {
	// if (c.mode === fc.Mode.Drag) {
	// 	console.log('click', c.drag_node)
	// }
})
document.addEventListener('keydown', e => {
	last_time_interaction = e.timeStamp
	switch (e.key) {
	case ' ': c.space_down = true ;break
	}
})
document.addEventListener('keyup', e => {
	last_time_interaction = e.timeStamp
	switch (e.key) {
	case ' ': c.space_down = false ;break
	}
})
document.addEventListener('visibilitychange', e => {
	if (document.hidden) {
		last_time_interaction = 0
	} else {
		last_time_interaction = e.timeStamp
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

canvas_el.addEventListener('touchstart', preventCancelable, NOT_PASSIVE)
canvas_el.addEventListener('touchmove' , preventCancelable, NOT_PASSIVE)
