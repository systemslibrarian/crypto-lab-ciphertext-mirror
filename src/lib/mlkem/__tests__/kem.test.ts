import { describe, expect, test } from 'vitest'
import { mlKemDecaps, mlKemEncaps, mlKemKeyGen } from '../kem'
import { paramsFor, type MlKemLevel } from '../params'
import { shake256 } from '../sha3'

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

  // Byte-exact FIPS 203 conformance against official NIST known-answer vectors now lives
  // in kat.test.ts (kat-vectors.json). This file covers the higher-level string-seeded API.
})

describe('FIPS 203 external input checks', () => {
  test.each(levels)('ML-KEM-%i validates key roles, ciphertext length and the embedded key hash', async (level) => {
    const pair = await mlKemKeyGen(level, 'input checks')
    const { ciphertext } = await mlKemEncaps(pair.pk, 'honest encapsulation')
    await expect(mlKemEncaps(pair.sk, 'wrong key role')).rejects.toThrow(/key length/)
    await expect(mlKemDecaps(pair.pk, pair.z, ciphertext)).rejects.toThrow(/key length/)
    for (const size of [ciphertext.length - 1, ciphertext.length + 1]) {
      await expect(mlKemDecaps(pair.sk, pair.z, new Uint8Array(size))).rejects.toThrow(/ciphertext length/)
    }
    const damaged = pair.sk.slice()
    const hashStart = 768 * paramsFor(level).k + 32
    damaged[hashStart] = damaged[hashStart]! ^ 1
    await expect(mlKemDecaps(damaged, pair.z, ciphertext)).rejects.toThrow(/key hash/)
    const zeros = new Uint8Array(ciphertext.length)
    const fallback = shake256(new Uint8Array([...pair.z, ...zeros]), 32)
    expect(await mlKemDecaps(pair.sk, pair.z, zeros)).toEqual(fallback)
  })

  test.each(levels)('ML-KEM-%i checks the modulus up to the final public coefficient', async (level) => {
    const { pk } = await mlKemKeyGen(level, 'modulus check')
    const end = pk.length - 32
    // The final 12-bit coefficient occupies the high nibble and the following byte.
    pk[end - 2] = pk[end - 2]! & 15
    pk[end - 1] = 208
    await expect(mlKemEncaps(pk, 'coefficient 3328')).resolves.toBeDefined()
    pk[end - 2] = pk[end - 2]! | 16
    await expect(mlKemEncaps(pk, 'coefficient 3329')).rejects.toThrow(/Noncanonical/)
  })
})
