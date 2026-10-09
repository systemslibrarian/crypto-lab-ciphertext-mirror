import { describe, expect, test } from 'vitest'
import { runDfOracleSim } from '../../cards/card-imperfect-df-oracle/sim'
import { applyRnrMask, detectSingleBitFault, removeRnrMask } from '../leakage/blinding'
import { hammingDistanceByte, pearsonCorrelation, simulateLeakageTrace } from '../leakage/model'
import { levelFromKeyLength } from '../mlkem/fips203'
import { foCompare } from '../mlkem/fo'
import { Xoshiro256 } from '../prng/xoshiro256'
import { makeBipartite } from '../viz/lattice'
import { movingAverage, normalizeSeries } from '../viz/trace'

describe('replay input and rejection controls', () => {
  test('FO comparison rejects length and byte changes at either end', () => {
    const original = new Uint8Array([1, 2, 3])
    expect(foCompare(original, original.slice())).toBe(true)
    expect(foCompare(original, original.subarray(0, 2))).toBe(false)
    expect(foCompare(original, new Uint8Array([0, 2, 3]))).toBe(false)
    expect(foCompare(original, new Uint8Array([1, 2, 2]))).toBe(false)
    expect(foCompare(new Uint8Array(), new Uint8Array())).toBe(true)
  })

  test('key-length inference accepts both standard key forms and rejects other lengths', () => {
    for (const [length, level] of [
      [800, 512],
      [1632, 512],
      [1184, 768],
      [2400, 768],
      [1568, 1024],
      [3168, 1024],
    ]) {
      expect(levelFromKeyLength(length!)).toBe(level)
    }
    for (const length of [0, 799, 801, 1631, 3169]) {
      expect(() => levelFromKeyLength(length)).toThrow('Unrecognized ML-KEM key length')
    }
  })

  test('the fault detector distinguishes an unchanged control, bit faults and truncation', () => {
    const original = new Uint8Array([0, 128])
    expect(detectSingleBitFault(original, original.slice())).toBe(false)
    expect(detectSingleBitFault(original, new Uint8Array([1, 128]))).toBe(true)
    expect(detectSingleBitFault(original, new Uint8Array([3, 128]))).toBe(true)
    expect(detectSingleBitFault(original, new Uint8Array([0]))).toBe(true)
    expect(detectSingleBitFault(new Uint8Array(), new Uint8Array())).toBe(false)
  })

  test('RNR masking restores negative, zero and boundary coefficients exactly', () => {
    const input = new Int16Array([-1664, -1, 0, 1, 1664])
    const { masked, mask } = applyRnrMask(input, new Xoshiro256(7n))
    expect(removeRnrMask(masked, mask)).toEqual(input)
    expect(input).toEqual(new Int16Array([-1664, -1, 0, 1, 1664]))
    expect(applyRnrMask(new Int16Array(), new Xoshiro256(7n)).masked).toHaveLength(0)
  })

  test('empty and constant observations cannot report correlation evidence', () => {
    expect(pearsonCorrelation([], [])).toBe(0)
    expect(pearsonCorrelation([1], [])).toBe(0)
    expect(pearsonCorrelation([1, 1, 1], [1, 2, 3])).toBe(0)
    expect(pearsonCorrelation([1, 2, 3], [2, 4, 6])).toBeCloseTo(1)
    expect(pearsonCorrelation([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1)
    expect(hammingDistanceByte(0x00, 0xff)).toBe(8)
  })

  test('a zero-noise trace measures Hamming weights without inventing missing samples', () => {
    expect(simulateLeakageTrace(new Uint8Array([0, 1, 255]), 0, new Xoshiro256(1n))).toEqual([
      { sample: 0, value: 0 },
      { sample: 1, value: 1 },
      { sample: 2, value: 8 },
    ])
    expect(simulateLeakageTrace(new Uint8Array(), 1, new Xoshiro256(1n))).toEqual([])
  })

  test('an unavailable oracle leaves every variable without confidence', () => {
    const unavailable = runDfOracleSim('no-evidence', 0.1, 0, 8)
    expect(unavailable.variables).toHaveLength(64)
    expect(unavailable.variables.every((v) => v.confidence === 0)).toBe(true)
    expect(new Set(unavailable.recoveredOverQueries).size).toBe(1)
    const noQueries = runDfOracleSim('no-evidence', 0.1, 1, 0)
    expect(noQueries.recoveredOverQueries).toEqual([])
    expect(noQueries.variables).toEqual(unavailable.variables)
  })
})

describe('replay visualization data boundaries', () => {
  test('normalization preserves sign and handles empty or zero-valued traces', () => {
    expect(normalizeSeries([])).toEqual([])
    expect(normalizeSeries([0, 0])).toEqual([0, 0])
    expect(normalizeSeries([-4, 2, 0])).toEqual([-1, 0.5, 0])
  })

  test('moving averages handle partial windows and never mutate measurements', () => {
    const input = [2, 4, 6, 8]
    expect(movingAverage(input, 2)).toEqual([2, 3, 5, 7])
    expect(movingAverage(input, 10)).toEqual([2, 3, 4, 5])
    expect(movingAverage([], 2)).toEqual([])
    const unchanged = movingAverage(input, 1)
    expect(unchanged).toEqual(input)
    expect(unchanged).not.toBe(input)
    expect(input).toEqual([2, 4, 6, 8])
  })

  test('Tanner diagram edges name real nodes and carry both signed weights', () => {
    const graph = makeBipartite(16, 2)
    const variables = new Set(graph.variables.map((v) => v.id))
    const checks = new Set(graph.checks.map((v) => v.id))
    expect(graph.edges).toHaveLength(7)
    expect(graph.edges.every((edge) => variables.has(edge.from) && checks.has(edge.to))).toBe(true)
    expect(new Set(graph.edges.map((edge) => edge.weight))).toEqual(new Set([-1, 1]))
    expect(makeBipartite(0, 0)).toEqual({ variables: [], checks: [], edges: [] })
  })
})
