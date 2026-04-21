import { describe, expect, test } from 'vitest'
import { mlKemDecaps, mlKemEncaps, mlKemKeyGen } from '../kem'
import type { MlKemLevel } from '../params'

const levels: MlKemLevel[] = [512, 768, 1024]

describe('ML-KEM pedagogical core', () => {
  test('round-trip key agreement across parameter sets', async () => {
    for (const level of levels) {
      for (let i = 0; i < 20; i += 1) {
        const seed = `rt:${level}:${i}`
        const keyPair = await mlKemKeyGen(level, seed)
        const encaps = await mlKemEncaps(keyPair.pk, `${seed}:enc`)
        const dec = await mlKemDecaps(keyPair.sk, keyPair.z, encaps.ciphertext)
        expect(Array.from(dec)).toEqual(Array.from(encaps.sharedSecret))
      }
    }
  })

  test('deterministic rerun from fixed seed', async () => {
    const keyA = await mlKemKeyGen(768, 'fixed-seed')
    const keyB = await mlKemKeyGen(768, 'fixed-seed')
    expect(Array.from(keyA.pk)).toEqual(Array.from(keyB.pk))
    expect(Array.from(keyA.sk)).toEqual(Array.from(keyB.sk))

    const encA = await mlKemEncaps(keyA.pk, 'fixed-seed:enc')
    const encB = await mlKemEncaps(keyA.pk, 'fixed-seed:enc')
    expect(Array.from(encA.ciphertext)).toEqual(Array.from(encB.ciphertext))
    expect(Array.from(encA.sharedSecret)).toEqual(Array.from(encB.sharedSecret))
  })

  test.skip('FIPS 203 KAT fixture alignment', () => {
    // Citation: FIPS 203 ML-KEM Known Answer Test files (NIST CAVP vectors).
    // This test is intentionally skipped until official vector fixtures are checked into this repository.
    expect(true).toBe(true)
  })
})
