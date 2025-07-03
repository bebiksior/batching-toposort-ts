import { expect } from 'chai'
import * as jsc from 'jsverify'
import batchingToposort from './index'
import { DAG } from './types'
import { describe, it } from 'vitest'

describe('batchingToposort', () => {
    it('toposorts an empty graph', () => {
        expect(batchingToposort({})).to.deep.equal([])
    })

    it('toposorts a simple DAG', () => {
        expect(
            batchingToposort({
                a: ['b'],
                b: ['c'],
                c: [],
            })
        ).to.deep.equal([['a'], ['b'], ['c']])
    })

    it('toposorts a richer DAG', () => {
        expect(
            batchingToposort({
                a: ['c'],
                b: ['c'],
                c: [],
            })
        ).to.deep.equal([['a', 'b'], ['c']])
    })

    it('toposorts a complex DAG', () => {
        expect(
            batchingToposort({
                a: ['c', 'f'],
                b: ['d', 'e'],
                c: ['f'],
                d: ['f', 'g'],
                e: ['h'],
                f: ['i'],
                g: ['j'],
                h: ['j'],
                i: [],
                j: [],
            })
        ).to.deep.equal([
            ['a', 'b'],
            ['c', 'd', 'e'],
            ['f', 'g', 'h'],
            ['i', 'j'],
        ])
    })

    it('errors on a small cyclic graph', () => {
        const dg: DAG = {
            a: ['b'],
            b: ['a'],
            c: [],
        }
        const sortCyclicGraph = (): void => {
            batchingToposort(dg)
        }
        expect(sortCyclicGraph).to.throw(Error)
    })

    it('errors on a larger cyclic graph', () => {
        const dg: DAG = {
            a: ['b', 'c'],
            b: ['c'],
            c: ['d', 'e'],
            d: ['b'],
            e: [],
        }
        const sortCyclicGraph = (): void => {
            batchingToposort(dg)
        }
        expect(sortCyclicGraph).to.throw(Error)
    })

    describe('properties:', () => {
        // Helpers
        const { constant: pure, tuple: tupleGen } = jsc.generator
        const boolGen = jsc.bool.generator
        const asciinestringGen = jsc.asciinestring.generator

        // Default array gen grows by log2 of `size` param. This is linear.
        const arrayGen = <T>(gen: jsc.Generator<T>): jsc.Generator<T[]> =>
            jsc.generator.bless((size: number) =>
                Array(jsc.random(0, size))
                    .fill(gen)
                    .map((g: jsc.Generator<T>) => g(size))
            )

        const replicate = <T>(n: number, g: jsc.Generator<T>): jsc.Generator<T[]> =>
            n === 0
                ? pure([]) // `tuple` cannot be empty
                : tupleGen(Array(n).fill(g))

        const dedupe = <T>(arr: T[]): T[] => [...new Set(arr)]

        const idGen = arrayGen(asciinestringGen).map(dedupe)

        const removeVx = (rmId: string, dag: DAG): DAG =>
            Object.entries(dag).reduce((newDag: DAG, [id, deps]) => {
                if (id !== rmId) newDag[id] = deps.filter(dep => dep !== rmId)
                return newDag
            }, {})

        const removeEdge = (edgeStart: string, edgeEnd: string, dag: DAG): DAG =>
            Object.entries(dag).reduce((newDag: DAG, [id, deps]) => {
                newDag[id] = deps.filter(
                    dep => !(id === edgeStart && dep === edgeEnd)
                )
                return newDag
            }, {})

        // "environment" of arbitrary instances
        const env = {
            dag: jsc.bless({
                generator: idGen.flatmap((vertexIds: string[]) => {
                    const numVxs = vertexIds.length
                    const numEdges = (numVxs * (numVxs - 1)) / 2
                    return replicate(numEdges, boolGen).flatmap((edgeBools: boolean[]) => {
                        const dag: DAG = {}
                        let edgeIdx = 0
                        for (let vx = 0; vx < numVxs; vx++) {
                            const vxId = vertexIds[vx]
                            dag[vxId] = dag[vxId] || []
                            for (let dep = vx + 1; dep < numVxs; dep++) {
                                const dependentId = vertexIds[dep]
                                const useEdge = edgeBools[edgeIdx++]
                                if (useEdge) dag[vxId].push(dependentId)
                            }
                        }
                        return pure(dag)
                    })
                }),
                shrink: jsc.shrink.bless((dag: DAG) => {
                    const dags: DAG[] = []
                    Object.entries(dag).forEach(([id, deps]) => {
                        dags.push(removeVx(id, dag))
                        deps.forEach(dep => {
                            dags.push(removeEdge(id, dep, dag))
                        })
                    })
                    return dags
                }),
                show: (a: DAG) => JSON.stringify(a),
            }),
        }

        const opts = {
            tests: 100,
            size: 50,
        }

        it('DAGs sort without error', () => {
            jsc.assert(
                jsc.forall('dag', env, (dag: DAG) => {
                    batchingToposort(dag)
                    return true
                }),
                opts
            )
        })

        it('toposorted DAGs do not lose tasks', () => {
            jsc.assert(
                jsc.forall('dag', env, (dag: DAG) => {
                    const sorted = batchingToposort(dag)
                    const flattened: string[] = ([] as string[]).concat.apply([], sorted)
                    return flattened.length === Object.keys(dag).length
                }),
                opts
            )
        })

        it('toposorted DAGs contain no empty sublists', () => {
            jsc.assert(
                jsc.forall('dag', env, (dag: DAG) => {
                    const sorted = batchingToposort(dag)
                    return !sorted.some(sublist => !sublist.length)
                }),
                opts
            )
        })

        it('toposort is externally pure', () => {
            jsc.assert(
                jsc.forall('dag', env, (dag: DAG) => {
                    Object.values(dag).forEach(list => Object.freeze(list))
                    Object.freeze(dag)
                    batchingToposort(dag)
                    return true
                }),
                opts
            )
        })
    })
})
