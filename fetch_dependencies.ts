import * as fs from 'node:fs'

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
		manifests: dependencyGraphManifests(first: 6) {
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

type Gql_Query_Error = {
	message: string
}

type Gql_Query_Result<T> = {
	data:   T | null
	errors: Gql_Query_Error[]
}

async function fetch_gql<V, T>(query: string, variables: V, token: string): Promise<T | null> {
	let res = await fetch('https://api.github.com/graphql', {
	    method: 'POST',
	    headers: {
	        'Content-Type': 'application/json',
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
		return null
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
	title:    string
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

function add_task(title: string, factory: () => Promise<void>): void {
	let task: Task = {
		title:    title,
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

	function add_repo(repo: Query_Data_Repo) {
		if (!repos_map.has(repo.name)) {
			repos_map.set(repo.name, {
				name:         repo.name,
				stars:        repo.stars,
				deps:         new Set(),
				fetched_deps: false,
			})
		}
	}

	let data_top_repos = await fetch_top_repositories(20, token)
	if (!data_top_repos) {
		throw Error("Couldn't fetch top repositories")
	}
	log('Fetched top repositories')

	for (let repo of data_top_repos.search.nodes) {
		add_repo(repo)
	}

	for (let i = 0; i < 2; i++) {
		for (let repo of Array.from(repos_map.values())) {
			if (repo.fetched_deps) continue

			add_task(`Fetch dependencies of ${repo.name}`, async () => {

				log(`Fetching dependencies of ${repo.name}...`)

				let data_deps = await fetch_dependencies(repo.name, 20, token)
				if (data_deps != null) {
					log(`Fetched dependencies of ${repo.name}!`)

					for (let manifest of data_deps.repository.manifests.nodes) {
						for (let dep of manifest.dependencies.nodes) {
							if (dep.repository == null) continue

							add_repo(dep.repository)
							repo.deps.add(dep.repository.name)
						}
					}
				} else {
					error(`Couldn't fetch deps for ${repo.name}.`)
				}

				repo.fetched_deps = true
			})
		}

		await until_all_tasks_are_done
	}

	let json_repos = Array.from(repos_map.values()).map(repo_to_json_repo)

	fs.writeFileSync('dependencies.json', JSON.stringify(json_repos, null, '\t'))
	log('Result have been written to dependencies.json')
	
}

main()
