import { describe, expect, test } from 'vitest'
import { ML_KEM_Q, nttBaseMultiply, nttForward, nttInverse, nttPointwiseMultiply } from '../fips203'

const Q = ML_KEM_Q
const N = 256

function modQ(x: number): number {
  return ((x % Q) + Q) % Q
}

/**
 * Independent reference: schoolbook multiplication in Z_q[X]/(X^256 + 1).
 * ML-KEM's NTT is a ring isomorphism onto this negacyclic ring, so
 * INTT(NTT(f) ∘ NTT(g)) must equal this product for all f, g.
 */
function negacyclicMul(f: number[], g: number[]): number[] {
  const out = new Array<number>(N).fill(0)
  for (let i = 0; i < N; i += 1) {
    for (let j = 0; j < N; j += 1) {
      const k = i + j
      const coeff = f[i]! * g[j]!
      if (k < N) {
        out[k] = modQ(out[k]! + coeff)
      } else {
        // X^256 = -1, so wrap with a sign flip.
        out[k - N] = modQ(out[k - N]! - coeff)
      }
    }
  }
  return out
}

function seededPoly(seed: number): number[] {
  // Small deterministic LCG so the test is reproducible without external state.
  let s = seed >>> 0
  return Array.from({ length: N }, () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s % Q
  })
}

describe('ML-KEM NTT (FIPS 203 §4.3)', () => {
  test('forward then inverse NTT is the identity', () => {
    const f = seededPoly(0xc0ffee)
    const roundTrip = nttInverse(nttForward(f))
    expect(roundTrip.map(modQ)).toEqual(f.map(modQ))
  })

  test('INTT(NTT(f) ∘ NTT(g)) equals schoolbook negacyclic f·g', () => {
    for (const [sa, sb] of [
      [1, 2],
      [0x1234, 0x9abc],
      [42, 1337],
    ] as const) {
      const f = seededPoly(sa)
      const g = seededPoly(sb)
      const viaNtt = nttInverse(nttPointwiseMultiply(nttForward(f), nttForward(g))).map(modQ)
      const reference = negacyclicMul(f, g)
      expect(viaNtt).toEqual(reference)
    }
  })

  test('nttBaseMultiply matches the degree-1 product mod (X^2 - γ)', () => {
    // For pair index i the modulus is X^2 - γ_i; the product of (a0+a1X)(b0+b1X)
    // reduces to (a0 b0 + a1 b1 γ_i) + (a0 b1 + a1 b0) X. We cannot read γ_i directly,
    // but it must satisfy that relation consistently: recover γ from one product and
    // confirm a second independent input pair reproduces it.
    const a0 = 11,
      a1 = 7,
      b0 = 5,
      b1 = 3
    const [c0, c1] = nttBaseMultiply(a0, a1, b0, b1, 9)
    expect(c1).toBe(modQ(a0 * b1 + a1 * b0))
    // Solve for γ from c0 = a0 b0 + a1 b1 γ  →  γ = (c0 - a0 b0) / (a1 b1) mod q.
    const a1b1Inv = modPow(modQ(a1 * b1), Q - 2)
    const gamma = modQ((c0 - a0 * b0) * a1b1Inv)
    const [d0, d1] = nttBaseMultiply(2, 9, 4, 6, 9)
    expect(d1).toBe(modQ(2 * 6 + 9 * 4))
    expect(d0).toBe(modQ(2 * 4 + 9 * 6 * gamma))
  })
})

function modPow(base: number, exp: number): number {
  let result = 1
  let b = modQ(base)
  let e = exp
  while (e > 0) {
    if (e & 1) result = modQ(result * b)
    b = modQ(b * b)
    e = Math.floor(e / 2)
  }
  return result
}
