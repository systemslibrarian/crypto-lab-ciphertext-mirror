import { Xoshiro256 } from '../prng/xoshiro256'

export function applyRnrMask(coeffs: Int16Array, prng: Xoshiro256): { masked: Int16Array; mask: Int16Array } {
  const mask = new Int16Array(coeffs.length)
  const masked = new Int16Array(coeffs.length)
  for (let i = 0; i < coeffs.length; i += 1) {
    const m = (prng.nextU32() % 3329) - 1664
    mask[i] = m
    masked[i] = (coeffs[i] ?? 0) + m
  }
  return { masked, mask }
}

export function removeRnrMask(masked: Int16Array, mask: Int16Array): Int16Array {
  const out = new Int16Array(masked.length)
  for (let i = 0; i < masked.length; i += 1) {
    out[i] = (masked[i] ?? 0) - (mask[i] ?? 0)
  }
  return out
}

export function detectSingleBitFault(before: Uint8Array, after: Uint8Array): boolean {
  if (before.length !== after.length) {
    return true
  }
  let diffBits = 0
  for (let i = 0; i < before.length; i += 1) {
    let x = (before[i] ?? 0) ^ (after[i] ?? 0)
    while (x > 0) {
      diffBits += x & 1
      x >>= 1
      if (diffBits > 1) {
        return true
      }
    }
  }
  return diffBits > 0
}
