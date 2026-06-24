import { describe, expect, test } from 'vitest'
import { sha3_256, sha3_512, shake128, shake256 } from '../sha3'

// Reference XOF outputs (256 bytes) computed with OpenSSL's SHAKE and pinned here so the
// test stays browser-pure. SHAKE output is a stable prefix, so a 256-byte vector validates
// every shorter length too — including ones that cross the rate-block boundary
// (SHAKE128 rate = 168 B, SHAKE256 = 136 B), which the old self-comparison never did.
const SHAKE128_ABC_256 =
  '5881092dd818bf5cf8a3ddb793fbcba74097d5c526a6d35f97b83351940f2cc844c50af32acd3f2cdd0665687' +
  '06f509bc1bdde58295dae3f891a9a0fca5783789a41f8611214ce612394df286a62d1a2252aa94db9c538956c' +
  '717dc2bed4f232a0294c857c730aa16067ac1062f1201fb0d377cfb9cde4c63599b27f3462bba4a0ed296c801' +
  'f9ff7f57302bb3076ee145f97a32ae68e76ab66c48d51675bd49acc29082f5647584e6aa01b3f5af057805f97' +
  '3ff8ecb8b226ac32ada6f01c1fcd4818cb006aa5b4cdb3611eb1e533c8964cacfdf31012cd3fb744d02225b98' +
  '8b475375faad996eb1b9176ecb0f8b2871723d6dbb804e23357e50732f5cfc904b1'
const SHAKE256_CL_256 =
  '872b58468750ab7ef73f15639d4341dda75c1075b62ad1be1469fa813218cc55998c22f0f099579b0bfe9291f' +
  '4c9b16c03293fb500842172e2917746b96751ec52d9dc4df7a6fbfa6541c9b763690ba00dedf2c5ff56e14088' +
  'cbe46ee3420c859a27fd5c647890ff1f2955adbe635080e1107aed2af57fb8ab722481050a1b8bbbaf35d1185' +
  '273a60d91a61c8480826ebba0e2f378d68b250d4905ba1faf13f55b8a6809299f8f0f41f8d58ac59218d8b591' +
  '5957b87850da15678ec7ae408412bf32a5a217f8ebe77f5ae13baedc8e606c04ad958dc36e7b0e234b2f9fb70' +
  'bd38a983a8f17d0fe988ca753b676a564888f8e344a8fc320ba80af7d732492677d'

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

  // Squeeze across the rate-block boundary and match the pinned OpenSSL reference at each
  // length (168/136 = exactly one block; the larger lengths force permutation refills).
  test('SHAKE128 multi-block squeeze matches the reference', () => {
    for (const len of [168, 169, 200, 256]) {
      expect(hex(shake128(bytes('abc'), len))).toBe(SHAKE128_ABC_256.slice(0, len * 2))
    }
  })

  test('SHAKE256 multi-block squeeze matches the reference', () => {
    for (const len of [136, 137, 200, 256]) {
      expect(hex(shake256(bytes('crypto-lab'), len))).toBe(SHAKE256_CL_256.slice(0, len * 2))
    }
  })

  test('SHAKE128 squeeze is a stable prefix (longer output extends shorter)', () => {
    const long = hex(shake128(bytes('prefix-stability'), 400))
    const short = hex(shake128(bytes('prefix-stability'), 100))
    expect(long.startsWith(short)).toBe(true)
  })
})
