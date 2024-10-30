import * as fg1 from './src/force.mjs'
import * as fg2 from './src/force_quad_tree.mjs'

import raw_data_la    from './data_la.json'    with {type: 'json'}
import raw_data_repos from './data_repos.json' with {type: 'json'}

type Bench = {
	name: string
	test: (times: number) => void
}

/*

BENCHMARK

*/

const ITERATIONS = [2 << 8, 2 << 10, 2 << 12, 2 << 14]

const noop = () => {}

const benches: Bench[] = [
	{
		name: "FG_1",
		test(times) {
			
			let entries  = Object.entries(raw_data_la)
			let node_map = /**@type {Map<string, fg.Node>}*/(new Map())

			let g = fg1.make_graph(fg1.DEFAULT_OPTIONS)

			/* NODES */
			for (let [key, raw] of entries) {

				let node = fg1.make_node()
				node.key   = key
				node.label = raw.prettyName

				fg1.add_node(g, node)
				node_map.set(key, node)
			}

			/* CONNECTIONS */
			for (let [key, raw] of entries) {
				let node = /** @type {fg.Node} */(node_map.get(key))

				for (let link_key of raw.connections) {
					let link_node = node_map.get(link_key)
					if (link_node) {
						fg1.connect(g, node, link_node)
					}
				}
			}

			/* MASS */
			for (let node of g.nodes) {
				let edges = fg1.get_node_edges(g, node)
				node.mass = fg1.node_mass_from_edges(edges.length)
			}

			fg1.set_positions_spread(g)

			for (let i = 0; i < times; i++) {
				fg1.simulate(g)
			}
		},
	},
	{
		name: "FG_2",
		test(times) {
			
			/**
			@typedef  {object} Mode_Map_Entry
			@property {fg.Node}                         node
			@property {number}                          edges
			@property {(typeof raw_data_repos)[number]} repo
			*/

			let node_map = /**@type {Map<string, Mode_Map_Entry>}*/(new Map())

			let g = fg2.make_graph({
				inertia_strength: 0.7,
				repel_strength:   0.7,
				repel_distance:   60,
				link_strength:    0.003,
				origin_strength:  0.0004,
				min_move:         0.001,
				grid_size:        1400,
			})

			let max_stars = 1

			/* NODES */
			for (let repo of raw_data_repos) {

				let node = fg2.make_node()
				node.key   = repo.name
				node.label = repo.name

				fg2.add_node(g, node)
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
						fg2.connect(g, entry.node, link_entry.node)
						link_entry.edges += 1
					}
				}
			}

			/* MASS */
			for (let entry of node_map.values()) {
				let mass_from_stars = entry.repo.stars/max_stars
				let mass_from_edges = fg2.node_mass_from_edges(entry.edges)
				entry.node.mass = 6*mass_from_stars + mass_from_edges/2
			}

			fg2.set_positions_spread(g)

			for (let i = 0; i < times; i++) {
				fg2.simulate(g)
			}
		},
	},
]

benches.reverse()


for (const runs of ITERATIONS) {
	console.log(`Running ${runs} times.`)

	for (const bench of benches) {

		let before = performance.now()
		bench.test(runs)
		let after = performance.now()
		let time = after-before

		console.log(`${bench.name}: ${time.toFixed(6)}ms`)
	}	
}

console.log(`DONE`)
