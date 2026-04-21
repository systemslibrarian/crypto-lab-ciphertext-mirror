import { describe, expect, test } from 'vitest'
import { intt, ntt } from '../ntt'
import { seedToBigInt, Xoshiro256 } from '../../prng/xoshiro256'

describe('NTT', () => {
  test('round-trip iNTT(NTT(f)) == f for random polynomials', () => {
    const prng = new Xoshiro256(seedToBigInt('ntt-roundtrip'))
    for (let t = 0; t < 50; t += 1) {
      const poly = new Int16Array(256)
      for (let i = 0; i < 256; i += 1) {
        poly[i] = (prng.nextU32() % 3329) - 1664
      }
      const back = intt(ntt(poly))
      expect(Array.from(back)).toEqual(Array.from(poly))
    }
  })
})
