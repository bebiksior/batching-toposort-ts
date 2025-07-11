import { expect } from 'chai'
import { countInDegrees } from './utils'
import { DAG } from './types'
import { describe, it } from 'vitest'

describe('countInDegrees', () => {
    it('counts in-degrees for an empty DAG', () => {
        const DAG: DAG = {}
        expect(countInDegrees(DAG)).to.deep.equal({})
    })

    it('counts in-degrees for a small DAG', () => {
        const DAG: DAG = {
            a: ['b'],
            b: [],
        }
        expect(countInDegrees(DAG)).to.deep.equal({
            a: 0,
            b: 1,
        })
    })

    it('counts in-degrees for a medium DAG', () => {
        const DAG: DAG = {
            a: ['b', 'c'],
            b: ['c'],
            c: [],
            d: [],
        }
        expect(countInDegrees(DAG)).to.deep.equal({
            a: 0,
            b: 1,
            c: 2,
            d: 0,
        })
    })

    it('counts in-degrees for a bigger DAG', () => {
        const DAG: DAG = {
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
        }
        expect(countInDegrees(DAG)).to.deep.equal({
            a: 0,
            b: 0,
            c: 1,
            d: 1,
            e: 1,
            f: 3,
            g: 1,
            h: 1,
            i: 1,
            j: 2,
        })
    })
})
