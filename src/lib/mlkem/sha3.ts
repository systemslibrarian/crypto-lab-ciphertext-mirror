// Keccak / SHA-3 (FIPS 202), implemented from the specification for inspectability.
// Provides the exact primitives FIPS 203 ML-KEM requires: SHA3-256, SHA3-512,
// SHAKE128 (as a streaming XOF for rejection sampling) and SHAKE256.

const MASK64 = (1n << 64n) - 1n

function rotl64(x: bigint, n: bigint): bigint {
  const r = n % 64n
  if (r === 0n) return x & MASK64
  return ((x << r) | (x >> (64n - r))) & MASK64
}

const RC: readonly bigint[] = [
  0x0000000000000001n,
  0x0000000000008082n,
  0x800000000000808an,
  0x8000000080008000n,
  0x000000000000808bn,
  0x0000000080000001n,
  0x8000000080008081n,
  0x8000000000008009n,
  0x000000000000008an,
  0x0000000000000088n,
  0x0000000080008009n,
  0x000000008000000an,
  0x000000008000808bn,
  0x800000000000008bn,
  0x8000000000008089n,
  0x8000000000008003n,
  0x8000000000008002n,
  0x8000000000000080n,
  0x000000000000800an,
  0x800000008000000an,
  0x8000000080008081n,
  0x8000000000008080n,
  0x0000000080000001n,
  0x8000000080008008n,
]

// Rho rotation offsets, indexed as lane[x + 5*y].
const ROT: readonly bigint[] = [
  0n,
  1n,
  62n,
  28n,
  27n,
  36n,
  44n,
  6n,
  55n,
  20n,
  3n,
  10n,
  43n,
  25n,
  39n,
  41n,
  45n,
  15n,
  21n,
  8n,
  18n,
  2n,
  61n,
  56n,
  14n,
]

function keccakF1600(s: bigint[]): void {
  for (let round = 0; round < 24; round += 1) {
    // theta
    const c = new Array<bigint>(5)
    for (let x = 0; x < 5; x += 1) {
      c[x] = s[x]! ^ s[x + 5]! ^ s[x + 10]! ^ s[x + 15]! ^ s[x + 20]!
    }
    const d = new Array<bigint>(5)
    for (let x = 0; x < 5; x += 1) {
      d[x] = c[(x + 4) % 5]! ^ rotl64(c[(x + 1) % 5]!, 1n)
    }
    for (let x = 0; x < 5; x += 1) {
      for (let y = 0; y < 5; y += 1) {
        s[x + 5 * y] = s[x + 5 * y]! ^ d[x]!
      }
    }
    // rho + pi
    const b = new Array<bigint>(25).fill(0n)
    for (let x = 0; x < 5; x += 1) {
      for (let y = 0; y < 5; y += 1) {
        b[y + 5 * ((2 * x + 3 * y) % 5)] = rotl64(s[x + 5 * y]!, ROT[x + 5 * y]!)
      }
    }
    // chi
    for (let x = 0; x < 5; x += 1) {
      for (let y = 0; y < 5; y += 1) {
        s[x + 5 * y] = b[x + 5 * y]! ^ (~b[((x + 1) % 5) + 5 * y]! & MASK64 & b[((x + 2) % 5) + 5 * y]!)
      }
    }
    // iota
    s[0] = s[0]! ^ RC[round]!
  }
}

/**
 * Streaming Keccak sponge. Absorb the full input once, then squeeze any number of
 * bytes (running the permutation between output blocks). Used directly as a SHAKE XOF.
 */
export class KeccakSponge {
  private readonly state: bigint[] = new Array<bigint>(25).fill(0n)
  private readonly rateBytes: number
  private squeezeBuf: Uint8Array = new Uint8Array(0)
  private squeezePos = 0

  constructor(rateBytes: number, suffix: number, input: Uint8Array) {
    this.rateBytes = rateBytes
    this.absorb(suffix, input)
  }

  private absorb(suffix: number, input: Uint8Array): void {
    const rate = this.rateBytes
    const blocks = Math.floor(input.length / rate) + 1
    const padded = new Uint8Array(blocks * rate)
    padded.set(input)
    padded[input.length] = suffix
    padded[blocks * rate - 1] = (padded[blocks * rate - 1] ?? 0) | 0x80

    for (let off = 0; off < padded.length; off += rate) {
      for (let i = 0; i < rate; i += 8) {
        let lane = 0n
        for (let b = 7; b >= 0; b -= 1) {
          lane = (lane << 8n) | BigInt(padded[off + i + b] ?? 0)
        }
        this.state[i / 8] = this.state[i / 8]! ^ lane
      }
      keccakF1600(this.state)
    }
    this.refill()
  }

  private refill(): void {
    const rate = this.rateBytes
    const out = new Uint8Array(rate)
    for (let i = 0; i < rate; i += 8) {
      let lane = this.state[i / 8]!
      for (let b = 0; b < 8; b += 1) {
        out[i + b] = Number(lane & 0xffn)
        lane >>= 8n
      }
    }
    this.squeezeBuf = out
    this.squeezePos = 0
  }

  squeeze(length: number): Uint8Array {
    const out = new Uint8Array(length)
    let produced = 0
    while (produced < length) {
      if (this.squeezePos >= this.rateBytes) {
        keccakF1600(this.state)
        this.refill()
      }
      const take = Math.min(length - produced, this.rateBytes - this.squeezePos)
      out.set(this.squeezeBuf.subarray(this.squeezePos, this.squeezePos + take), produced)
      this.squeezePos += take
      produced += take
    }
    return out
  }
}

const RATE = { sha3_256: 136, sha3_512: 72, shake128: 168, shake256: 136 } as const

export function sha3_256(input: Uint8Array): Uint8Array {
  return new KeccakSponge(RATE.sha3_256, 0x06, input).squeeze(32)
}

export function sha3_512(input: Uint8Array): Uint8Array {
  return new KeccakSponge(RATE.sha3_512, 0x06, input).squeeze(64)
}

export function shake256(input: Uint8Array, outLen: number): Uint8Array {
  return new KeccakSponge(RATE.shake256, 0x1f, input).squeeze(outLen)
}

export function shake128(input: Uint8Array, outLen: number): Uint8Array {
  return new KeccakSponge(RATE.shake128, 0x1f, input).squeeze(outLen)
}

/** A SHAKE128 XOF kept open for incremental squeezing (rejection sampling of  Â). */
export function shake128Xof(input: Uint8Array): KeccakSponge {
  return new KeccakSponge(RATE.shake128, 0x1f, input)
}
