import { describe, expect, test } from 'vitest'
import { mlkemDecapsInternal, mlkemEncapsInternal, mlkemKeyGenInternal } from '../fips203'
import type { MlKemLevel } from '../params'
import { shake256 } from '../sha3'

const SIZES: Record<MlKemLevel, { ek: number; dk: number; ct: number }> = {
  512: { ek: 800, dk: 1632, ct: 768 },
  768: { ek: 1184, dk: 2400, ct: 1088 },
  1024: { ek: 1568, dk: 3168, ct: 1568 },
}

function seedBytes(label: string, len: number): Uint8Array {
  const out = new Uint8Array(len)
  for (let i = 0; i < len; i += 1) out[i] = (label.charCodeAt(i % label.length) + i * 31) & 0xff
  return out
}

const levels: MlKemLevel[] = [512, 768, 1024]

describe('FIPS 203 ML-KEM core', () => {
  test('keys and ciphertexts have the FIPS-mandated sizes', () => {
    for (const level of levels) {
      const { ek, dk } = mlkemKeyGenInternal(level, seedBytes('d', 32), seedBytes('z', 32))
      const { ciphertext } = mlkemEncapsInternal(level, ek, seedBytes('m', 32))
      expect(ek.length).toBe(SIZES[level].ek)
      expect(dk.length).toBe(SIZES[level].dk)
      expect(ciphertext.length).toBe(SIZES[level].ct)
    }
  })

  test('encaps/decaps agree on the shared secret (round trip)', () => {
    for (const level of levels) {
      const { ek, dk } = mlkemKeyGenInternal(level, seedBytes(`d${level}`, 32), seedBytes(`z${level}`, 32))
      const { sharedSecret, ciphertext } = mlkemEncapsInternal(level, ek, seedBytes(`m${level}`, 32))
      const recovered = mlkemDecapsInternal(level, dk, ciphertext)
      expect(Array.from(recovered)).toEqual(Array.from(sharedSecret))
    }
  })

  test('implicit rejection: a corrupted ciphertext yields a different (not crashing) secret', () => {
    const { ek, dk } = mlkemKeyGenInternal(512, seedBytes('dr', 32), seedBytes('zr', 32))
    const { sharedSecret, ciphertext } = mlkemEncapsInternal(512, ek, seedBytes('mr', 32))
    const tampered = ciphertext.slice()
    tampered[0] = (tampered[0] ?? 0) ^ 0xff
    const rejected = mlkemDecapsInternal(512, dk, tampered)
    expect(rejected.length).toBe(32)
    expect(Array.from(rejected)).not.toEqual(Array.from(sharedSecret))
  })

  test('implicit rejection is deterministic (same tampered ciphertext → same secret)', () => {
    // The rejection secret is J(z‖c); it must depend only on z and c, so repeated
    // decapsulation of the same invalid ciphertext must return the identical value.
    const { ek, dk } = mlkemKeyGenInternal(768, seedBytes('drd', 32), seedBytes('zrd', 32))
    const { ciphertext } = mlkemEncapsInternal(768, ek, seedBytes('mrd', 32))
    const tampered = ciphertext.slice()
    tampered[5] = (tampered[5] ?? 0) ^ 0x01
    const first = mlkemDecapsInternal(768, dk, tampered)
    const second = mlkemDecapsInternal(768, dk, tampered)
    expect(Array.from(first)).toEqual(Array.from(second))

    // A different tampering location yields a different rejection secret (J depends on c).
    const other = ciphertext.slice()
    other[6] = (other[6] ?? 0) ^ 0x01
    const otherSecret = mlkemDecapsInternal(768, dk, other)
    expect(Array.from(otherSecret)).not.toEqual(Array.from(first))
  })

  test('deterministic for fixed seeds', () => {
    const a = mlkemKeyGenInternal(768, seedBytes('dd', 32), seedBytes('zz', 32))
    const b = mlkemKeyGenInternal(768, seedBytes('dd', 32), seedBytes('zz', 32))
    expect(Array.from(a.ek)).toEqual(Array.from(b.ek))
    expect(Array.from(a.dk)).toEqual(Array.from(b.dk))
  })
})

// Regression for incomplete FO checks, motivated by ePrint 2026/2239.
// This tests rejection coverage; it does not implement key recovery.
for (const level of levels) {
  test(`ML-KEM-${level}: every ciphertext byte and v coordinate rejects exactly`, () => {
    const z = seedBytes(`coverage-z${level}`, 32)
    const { ek, dk } = mlkemKeyGenInternal(level, seedBytes(`coverage-d${level}`, 32), z)
    const { ciphertext, sharedSecret } = mlkemEncapsInternal(level, ek, seedBytes(`coverage-m${level}`, 32))
    expect(mlkemDecapsInternal(level, dk, ciphertext)).toEqual(sharedSecret)
    const dv = level === 1024 ? 5 : 4
    const vOffset = ciphertext.length - 32 * dv
    const bits = new Set<number>()
    for (let i = 0; i < ciphertext.length; i += 1) bits.add(i * 8)
    for (let i = 0; i < 256; i += 1) bits.add(vOffset * 8 + i * dv)
    for (const bit of bits) {
      const changed = ciphertext.slice()
      const byte = Math.floor(bit / 8)
      changed[byte] = changed[byte]! ^ (1 << (bit % 8))
      const input = new Uint8Array(z.length + changed.length)
      input.set(z)
      input.set(changed, z.length)
      expect(mlkemDecapsInternal(level, dk, changed), `mutated bit ${bit}`).toEqual(shake256(input, 32))
    }
  }, 120000)
}
