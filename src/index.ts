import { DAG, TaskBatches } from './types'
import { countInDegrees, getRoots, getNonRoots } from './utils'

const batchingToposort = (dag: DAG): TaskBatches => {
  const indegrees = countInDegrees(dag)
  const sorted: TaskBatches = []

  let roots = getRoots(indegrees)

  while (roots.length) {
    sorted.push(roots)

    const newRoots: string[] = []
    roots.forEach(root => {
      dag[root].forEach(dependent => {
        indegrees[dependent]--
        if (indegrees[dependent] === 0) {
          newRoots.push(dependent)
        }
      })
    })

    roots = newRoots
  }

  if (getNonRoots(indegrees).length) {
    throw new Error('Cycle(s) detected; toposort only works on acyclic graphs')
  }

  return sorted
}

export default batchingToposort
export { batchingToposort }
