import * as fs from 'node:fs'

// don't care about books / awesome lists / configs
const IGNORED_REPO_NAMES = new Set([
	'codecrafters-io/build-your-own-x',
	'vinta/awesome-python',
	'awesome-selfhosted/awesome-selfhosted',
	'sindresorhus/awesome',
	'jwasham/coding-interview-university',
	'public-apis/public-apis',
	'kamranahmedse/developer-roadmap',
	'donnemartin/system-design-primer',
	'996icu/996.ICU',
	'practical-tutorials/project-based-learning',
	'getify/You-Dont-Know-JS',
	'CyC2018/CS-Notes',
	'laytan/setup-odin',
	'DefinitelyTyped/DefinitelyTyped',
	'Kikobeats/top-sites',
	'octokit/tsconfig',
	'indexzero/populist-style',
])

function is_ignored(name: string): boolean {
	return IGNORED_REPO_NAMES.has(name) ||
	       /\b(actions|action|setup|config)\b/.test(name)
}

// personal favorites I want to include
const SELECTED_REPO_NAMES = [
	'thetarnav/odin-wasm',
	'DanielGavin/ols',
	'thetarnav/bilang',
	'thetarnav/solid-devtools',
	'microsoft/vscode',
	'darktable-org/darktable',
	'webui-dev/webui',
	'monkeytypegame/monkeytype',
	'zyedidia/micro',
	'raysan5/raylib',
	'floooh/sokol',
	'aseprite/aseprite',
	'sharkdp/hyperfine',
	'fish-shell/fish-shell',
	'junegunn/fzf',
	'vitessio/vitess',
	'lapce/lapce',
	'torvalds/linux',
	'excalidraw/excalidraw',
	'blender/blender',
	'godotengine/godot',
	'Aider-AI/aider',
]

const DEP_MANIFESTS_AMOUNT = 6

const QUERY_FIELDS_REPO = `
	name:  nameWithOwner
	stars: stargazerCount
`

const QUERY_TOP_REPOS = `query($amount: Int!) {
	search(query: "stars:>1", type: REPOSITORY, first: $amount) {
		nodes {
			... on Repository {${QUERY_FIELDS_REPO}}
		}
	}
}`

const QUERY_DEPS = `query($owner: String!, $repo_name: String!, $amount: Int!) {
	repository(owner: $owner, name: $repo_name) {
		manifests: dependencyGraphManifests(first: ${DEP_MANIFESTS_AMOUNT}) {
			nodes {
				dependencies(first: $amount) {
					nodes {
						repository {${QUERY_FIELDS_REPO}}
					}
				}
			}
		}
	}
}`

type Query_Data_Repo = {
	name:  string
	stars: number
}

type Query_Data_Top_Repos = {
	search: {
		nodes: Query_Data_Repo[]
	}
}

type Query_Data_Dependencies = {
	repository: {
		manifests: {
			nodes: {
				dependencies: {
					nodes: {
						repository: Query_Data_Repo | null
					}[]
				}
			}[]
		}
	}
}

type Query_Variables_Top_Repos = {
	amount: number
}

type Query_Variables_Dependencies = {
	owner:     string
	repo_name: string
	amount:    number
}

const QUERY_REPO_DETAILS = `query($owner: String!, $repo_name: String!, $amount: Int!) {
    repository(owner: $owner, name: $repo_name) {
        ... on Repository {
            ${QUERY_FIELDS_REPO}
            manifests: dependencyGraphManifests(first: ${DEP_MANIFESTS_AMOUNT}) {
                nodes {
                    dependencies(first: $amount) {
                        nodes {
                            repository {${QUERY_FIELDS_REPO}}
                        }
                    }
                }
            }
        }
    }
}`

type Query_Data_Repo_Details = {
    repository: {
        name:  string
        stars: number
        manifests: {
            nodes: {
                dependencies: {
                    nodes: {
                        repository: Query_Data_Repo | null
                    }[]
                }
            }[]
        }
    }
}

type Query_Variables_Repo_Details = {
    owner:     string
    repo_name: string
    amount:    number
}

async function fetch_gql<V, T>(query: string, variables: V, token: string, retry_count = 0): Promise<T | null> {
	let res = await fetch('https://api.github.com/graphql', {
	    method: 'POST',
	    headers: {
	        'Content-Type':  'application/json',
	        'Authorization': `Bearer ${token}`
	    },
	    body: JSON.stringify({
	        query:     query,
	        variables: variables,
	    })
	})
	let json = await res.json()
	if (!res.ok) {
		if (json.message) {
			console.error(json.message)
		} else {
			console.log(res.statusText)
		}
		if (retry_count > 2) {
			return null
		}
		retry_count += 1
		await new Promise(r => setTimeout(r, retry_count*5000))
		return fetch_gql(query, variables, token, retry_count)
	}
	if (Array.isArray(json.errors)) {
		for (let err of json.errors) {
			console.error(err.message)
		}
	}
	return json.data
}

function fetch_top_repositories(amount: number, token: string): Promise<Query_Data_Top_Repos | null> {
	return fetch_gql<Query_Variables_Top_Repos, Query_Data_Top_Repos>(QUERY_TOP_REPOS, {amount}, token)
}

function fetch_dependencies(name: string, amount: number, token: string): Promise<Query_Data_Dependencies | null> {
	let [owner, repo_name] = name.split('/')
	return fetch_gql<Query_Variables_Dependencies, Query_Data_Dependencies>(QUERY_DEPS, {owner, repo_name, amount}, token)
}

function fetch_details(name: string, amount: number, token: string): Promise<Query_Data_Repo_Details | null> {
	let [owner, repo_name] = name.split('/')
	return fetch_gql<Query_Variables_Repo_Details, Query_Data_Repo_Details>(QUERY_REPO_DETAILS, {owner, repo_name, amount}, token)
}

type Repo = {
	name:         string // <owner>/<repo_name>
	stars:        number
	deps:         Set<string>
	fetched_deps: boolean
}

type JSON_Repo = {
	name:         string // <owner>/<repo_name>
	stars:        number
	deps:         string[]
}

function log(message: string) {
	console.log(`\x1b[34m%s\x1b[0m`, message)
}
function error(message: string) {
	console.error(`\x1b[31m%s\x1b[0m`, message)
}

function repo_to_json_repo(repo: Repo): JSON_Repo {
	return {
		name:  repo.name,
		stars: repo.stars,
		deps:  Array.from(repo.deps),
	}
}

type Task = {
	factory:  () => Promise<void>
	priority: number
	running:  boolean
}
let task_queue: Task[] = []
let tasks_running = 0

let until_all_tasks_are_done_resolve: () => void
let until_all_tasks_are_done: Promise<void>

set_until_all_tasks_are_done()

function set_until_all_tasks_are_done() {
	until_all_tasks_are_done = new Promise(res => {
		until_all_tasks_are_done_resolve = res
	})
}

function run_tasks(): void {

	for (let i = tasks_running; i < 3; i++) {

		let max_prority = 0
		let picked_task: Task | null = null

		for (let task of task_queue) {
			if (!task.running && task.priority > max_prority) {
				max_prority = task.priority
				picked_task = task
			}
		}
		if (picked_task == null) continue

		picked_task.running = true
		tasks_running++
		let promise = picked_task.factory()

		promise.finally(() => {
			for (let i = 0; i < task_queue.length; i++) {
				if (task_queue[i] === picked_task) {
					task_queue[i] = task_queue[task_queue.length-1]
					task_queue.pop()
					break
				}
			}
			tasks_running--
			run_tasks()
		})
	}

	if (task_queue.length === 0) {
		until_all_tasks_are_done_resolve()
		set_until_all_tasks_are_done()
	}
}

function add_task(factory: () => Promise<void>): void {
	let task: Task = {
		factory:  factory,
		priority: 1/(task_queue.length+1),
		running:  false,
	}
	task_queue.push(task)
	run_tasks()
}

async function main() {

	const token = process.env['GITHUB_TOKEN'] || process.env['TOKEN']
	if (!token) {
		error('Github token not found. Run this script with GITHUB_TOKEN or TOKEN environment variables set.')
		process.exit(1)
	}

	let repos_map = new Map<string, Repo>()

	function add_repo(data: Query_Data_Repo): Repo {
		let repo = repos_map.get(data.name)
		if (repo == null) {
			repo = {
				name:         data.name,
				stars:        data.stars,
				deps:         new Set(),
				fetched_deps: false,
			}
			repos_map.set(data.name, repo)
		}
		return repo
	}

	// let data_top_repos = await fetch_top_repositories(20, token)
	// if (!data_top_repos) {
	// 	throw Error("Couldn't fetch top repositories")
	// }
	// log('Fetched top repositories')

	// for (let repo of data_top_repos.search.nodes) {
	// 	if (!is_ignored(repo.name)) {
	// 		add_repo(repo)
	// 	}
	// }

	for (let name of SELECTED_REPO_NAMES) {
		add_task(async () => {

			log(`Fetching ${name}...`)

			let data = await fetch_details(name, 20, token)
			if (data == null) {
				error(`Couldn't fetch ${name}.`)
				return
			}
			log(`Fetched ${name}!`)

			let repo = add_repo(data.repository)
			repo.fetched_deps = true

			for (let manifest of data.repository.manifests.nodes) {
				for (let dep of manifest.dependencies.nodes) {
					if (dep.repository != null && !is_ignored(dep.repository.name)) {
						add_repo(dep.repository)
						repo.deps.add(dep.repository.name)
					}
				}
			}
		})

		await until_all_tasks_are_done
	}

	for (let i = 0; i < 2; i++) {
		for (let repo of Array.from(repos_map.values())) {
			if (repo.fetched_deps || is_ignored(repo.name)) continue

			add_task(async () => {

				log(`Fetching ${repo.name}...`)

				let data_deps = await fetch_dependencies(repo.name, 20, token)
				if (data_deps != null) {
					log(`Fetched ${repo.name}!`)

					for (let manifest of data_deps.repository.manifests.nodes) {
						for (let dep of manifest.dependencies.nodes) {
							if (dep.repository != null && !is_ignored(dep.repository.name)) {
								add_repo(dep.repository)
								repo.deps.add(dep.repository.name)
							}
						}
					}
				} else {
					error(`Couldn't fetch ${repo.name}.`)
				}

				repo.fetched_deps = true
			})
		}

		await until_all_tasks_are_done
	}

	let json_repos = Array.from(repos_map.values()).map(repo_to_json_repo)

	fs.writeFileSync('data_repos.json', JSON.stringify(json_repos, null, '\t'))
	log('Result have been written to data_repos.json')
	
}

main()
