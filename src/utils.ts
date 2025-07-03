import { DAG, InDegreeMap } from './types'

export const countInDegrees = (dag: DAG): InDegreeMap => {
  const counts: InDegreeMap = {}
  Object.entries(dag).forEach(([vx, dependents]) => {
    counts[vx] = counts[vx] || 0
    dependents.forEach(dependent => {
      counts[dependent] = counts[dependent] || 0
      counts[dependent]++
    })
  })
  return counts
}

const filterByDegree = (predicate: (deg: number) => boolean) => (
  counts: InDegreeMap
): string[] =>
  Object.entries(counts)
    .filter(([_, deg]) => predicate(deg))
    .map(([id, _]) => id)

export const getRoots = filterByDegree(deg => deg === 0)
export const getNonRoots = filterByDegree(deg => deg !== 0)
