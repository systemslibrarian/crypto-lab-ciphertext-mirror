const MASK_64 = (1n << 64n) - 1n

function rotl(x: bigint, k: bigint): bigint {
  return ((x << k) & MASK_64) | (x >> (64n - k))
}

function splitmix64(state: bigint): bigint {
  let z = (state + 0x9e3779b97f4a7c15n) & MASK_64
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK_64
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK_64
  return z ^ (z >> 31n)
}

export class Xoshiro256 {
  private s0: bigint
  private s1: bigint
  private s2: bigint
  private s3: bigint

  constructor(seed: bigint) {
    const a = splitmix64(seed)
    const b = splitmix64(a)
    const c = splitmix64(b)
    const d = splitmix64(c)
    this.s0 = a
    this.s1 = b
    this.s2 = c
    this.s3 = d
  }

  nextBigInt(): bigint {
    const result = (rotl((this.s1 * 5n) & MASK_64, 7n) * 9n) & MASK_64
    const t = (this.s1 << 17n) & MASK_64

    this.s2 ^= this.s0
    this.s3 ^= this.s1
    this.s1 ^= this.s2
    this.s0 ^= this.s3

    this.s2 ^= t
    this.s3 = rotl(this.s3, 45n)

    return result
  }

  nextU32(): number {
    const value = this.nextBigInt() & 0xffffffffn
    return Number(value)
  }

  nextFloat(): number {
    return this.nextU32() / 0x100000000
  }

  nextBytes(length: number): Uint8Array {
    const out = new Uint8Array(length)
    for (let i = 0; i < length; i += 1) {
      out[i] = this.nextU32() & 0xff
    }
    return out
  }
}

export function seedToBigInt(seed: string): bigint {
  let acc = 1469598103934665603n
  for (const ch of seed) {
    acc ^= BigInt(ch.charCodeAt(0))
    acc = (acc * 1099511628211n) & MASK_64
  }
  return acc
}
