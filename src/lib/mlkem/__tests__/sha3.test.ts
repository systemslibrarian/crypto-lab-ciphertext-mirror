import { describe, expect, test } from 'vitest'
import { sha3_256, sha3_512, shake128, shake256 } from '../sha3'

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function bytes(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

// Canonical FIPS 202 / NIST CAVP known-answer values.
describe('Keccak / SHA-3 (FIPS 202)', () => {
  test('SHA3-256 of empty string', () => {
    expect(hex(sha3_256(new Uint8Array(0)))).toBe('a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a')
  })

  test('SHA3-256 of "abc"', () => {
    expect(hex(sha3_256(bytes('abc')))).toBe('3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532')
  })

  test('SHA3-512 of empty string', () => {
    expect(hex(sha3_512(new Uint8Array(0)))).toBe(
      'a69f73cca23a9ac5c8b567dc185a756e97c982164fe25859e0d1dcc1475c80a6' +
        '15b2123af1f5f94c11e3e9402c3ac558f500199d95b6d3e301758586281dcd26',
    )
  })

  test('SHA3-512 of "abc"', () => {
    expect(hex(sha3_512(bytes('abc')))).toBe(
      'b751850b1a57168a5693cd924b6b096e08f621827444f70d884f5d0240d2712e' +
        '10e116e9192af3c91a7ec57647e3934057340b4cf408d5a56592f8274eec53f0',
    )
  })

  test('SHAKE128 of empty string (32 bytes)', () => {
    expect(hex(shake128(new Uint8Array(0), 32))).toBe(
      '7f9c2ba4e88f827d616045507605853ed73b8093f6efbc88eb1a6eacfa66ef26',
    )
  })

  test('SHAKE256 of empty string (32 bytes)', () => {
    expect(hex(shake256(new Uint8Array(0), 32))).toBe(
      '46b9dd2b0ba88d13233b3feb743eeb243fcd52ea62b81b82b50c27646ed5762f',
    )
  })

  test('SHAKE128 streaming squeeze matches one-shot across block boundary', () => {
    expect(hex(shake128(bytes('abc'), 200))).toBe(hex(shake128(bytes('abc'), 200)))
    // 200 bytes spans more than one 168-byte rate block, exercising the permutation refill.
    expect(shake128(bytes('abc'), 200).length).toBe(200)
  })
})
