import { Xoshiro256 } from '../prng/xoshiro256'
import { freezePoly } from './poly'
import { keccakExpand } from './keccak'

async function subtleDigestOrNull(algo: string, data: Uint8Array): Promise<Uint8Array | null> {
  try {
    const bytes = Uint8Array.from(data)
    const digest = await crypto.subtle.digest(algo, bytes.buffer)
    return new Uint8Array(digest)
  } catch {
    return null
  }
}

export async function shakeExpand(seed: Uint8Array, outLen: number): Promise<Uint8Array> {
  const sha3_256 = await subtleDigestOrNull('SHA3-256', seed)
  if (sha3_256) {
    const out = new Uint8Array(outLen)
    let offset = 0
    let counter = 0
    while (offset < outLen) {
      const block = new Uint8Array(sha3_256.length + 4)
      block.set(sha3_256, 0)
      block[sha3_256.length] = counter & 0xff
      block[sha3_256.length + 1] = (counter >> 8) & 0xff
      block[sha3_256.length + 2] = (counter >> 16) & 0xff
      block[sha3_256.length + 3] = (counter >> 24) & 0xff
      const dig = await subtleDigestOrNull('SHA3-512', block)
      if (!dig) {
        break
      }
      const take = Math.min(dig.length, outLen - offset)
      out.set(dig.slice(0, take), offset)
      offset += take
      counter += 1
    }
    if (offset === outLen) {
      return out
    }
  }
  return keccakExpand(seed, outLen)
}

export function sampleCbd(bytes: Uint8Array, eta: 2 | 3): Int16Array {
  const coeffs = new Array<number>(256).fill(0)
  const bitsPerCoeff = eta * 2
  for (let i = 0; i < 256; i += 1) {
    let value = 0
    for (let bit = 0; bit < bitsPerCoeff; bit += 1) {
      const idx = i * bitsPerCoeff + bit
      const b = (bytes[idx >> 3] ?? 0) >> (idx & 7)
      const one = b & 1
      value += bit < eta ? one : -one
    }
    coeffs[i] = value
  }
  return freezePoly(coeffs)
}

export function sampleUniform(prng: Xoshiro256): Int16Array {
  const coeffs = new Array<number>(256).fill(0)
  let i = 0
  while (i < 256) {
    const x = prng.nextU32() & 0x0fff
    if (x < 3329) {
      coeffs[i] = x
      i += 1
    }
  }
  return freezePoly(coeffs)
}
