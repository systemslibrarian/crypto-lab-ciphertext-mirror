import { describe, expect, test } from 'vitest'
import { binaryEntropy, channelInformation, majorityErrors } from '../information'

describe('exact binary-channel information', () => {
  test('endpoints and biased noiseless input', () => {
    expect(binaryEntropy(0)).toBe(0)
    expect(binaryEntropy(1)).toBe(0)
    expect(binaryEntropy(0.5)).toBe(1)
    for (const q of [0, 0.1, 0.5, 0.9, 1]) {
      expect(channelInformation(0.5, q)).toBe(0)
      expect(channelInformation(1, q)).toBeCloseTo(binaryEntropy(q), 12)
    }
    expect(channelInformation(0.95, 0.5)).toBeCloseTo(0.7136030428840437, 12)
  })
  test('balance maximizes information; relabeling and bias reflection preserve it', () => {
    for (const rho of [0.5, 0.6, 0.95, 1]) {
      for (const q of [0, 0.1, 0.25, 0.5, 0.75, 1]) {
        expect(channelInformation(rho, q)).toBeLessThanOrEqual(channelInformation(rho, 0.5) + 1e-12)
        expect(channelInformation(rho, q)).toBeCloseTo(channelInformation(1 - rho, q), 12)
        expect(channelInformation(rho, q)).toBeCloseTo(channelInformation(rho, 1 - q), 12)
      }
    }
  })
  test('majority agrees with enumeration of all independent error patterns', () => {
    for (const n of [1, 3, 5, 9, 15]) {
      let expected = 0
      for (let mask = 0; mask < 2 ** n; mask++) {
        const errors = mask.toString(2).replaceAll('0', '').length
        if (errors > n / 2) expected += 0.2 ** errors * 0.8 ** (n - errors)
      }
      expect(majorityErrors(0.8, n).iid).toBeCloseTo(expected, 12)
      expect(majorityErrors(0.8, n).sharedBurst).toBeCloseTo(0.2, 12)
      expect(majorityErrors(0.5, n).iid).toBeCloseTo(0.5, 12)
      expect(majorityErrors(1, n)).toEqual({ iid: 0, sharedBurst: 0 })
    }
  })
  test('rejects invalid domains', () => {
    for (const p of [-1, 1.1, NaN, Infinity]) {
      expect(() => binaryEntropy(p)).toThrow(RangeError)
      expect(() => channelInformation(p, 0.5)).toThrow(RangeError)
      expect(() => channelInformation(0.9, p)).toThrow(RangeError)
      expect(() => majorityErrors(p, 5)).toThrow(RangeError)
    }
    for (const n of [0, 2, 17, 2.5, NaN]) expect(() => majorityErrors(0.9, n)).toThrow(RangeError)
  })
})
