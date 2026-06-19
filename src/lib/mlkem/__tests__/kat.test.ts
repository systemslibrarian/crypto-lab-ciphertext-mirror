import { describe, expect, test } from 'vitest'
import { mlkemDecapsInternal, mlkemEncapsInternal, mlkemKeyGenInternal } from '../fips203'
import type { MlKemLevel } from '../params'
import vectors from './kat-vectors.json'

// Authentic FIPS 203 known-answer vectors (first record of each parameter set) from
// post-quantum-cryptography/KAT (kat_MLKEM_{512,768,1024}.rsp), explicitly compliant with
// FIPS 203 (published 2024-08-13). Fields: d,z keygen seeds; m encaps message; ek/dk keys;
// ct/ss the encapsulation outputs; ct_n/ss_n the implicit-rejection (invalid-ciphertext) case.

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.substr(i * 2, 2), 16)
  return out
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

const levels: MlKemLevel[] = [512, 768, 1024]

describe('FIPS 203 ML-KEM — NIST known-answer conformance', () => {
  for (const level of levels) {
    const v = (vectors as Record<string, Record<string, string>>)[String(level)]!

    test(`ML-KEM-${level} KeyGen produces the exact ek and dk`, () => {
      const { ek, dk } = mlkemKeyGenInternal(level, fromHex(v.d!), fromHex(v.z!))
      expect(toHex(ek)).toBe(v.ek!.toUpperCase())
      expect(toHex(dk)).toBe(v.dk!.toUpperCase())
    })

    test(`ML-KEM-${level} Encaps produces the exact ciphertext and shared secret`, () => {
      const { ciphertext, sharedSecret } = mlkemEncapsInternal(level, fromHex(v.ek!), fromHex(v.m!))
      expect(toHex(ciphertext)).toBe(v.ct!.toUpperCase())
      expect(toHex(sharedSecret)).toBe(v.ss!.toUpperCase())
    })

    test(`ML-KEM-${level} Decaps recovers the shared secret`, () => {
      const k = mlkemDecapsInternal(level, fromHex(v.dk!), fromHex(v.ct!))
      expect(toHex(k)).toBe(v.ss!.toUpperCase())
    })

    test(`ML-KEM-${level} Decaps implicit rejection matches (invalid ciphertext)`, () => {
      const k = mlkemDecapsInternal(level, fromHex(v.dk!), fromHex(v.ct_n!))
      expect(toHex(k)).toBe(v.ss_n!.toUpperCase())
    })
  }
})
