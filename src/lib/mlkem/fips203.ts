// FIPS 203 (ML-KEM) reference implementation in TypeScript.
//
// This is real lattice-based ML-KEM — matrix generation, NTT, CBD sampling,
// compression and the Fujisaki–Okamoto transform — built on the Keccak in sha3.ts.
// It is written for inspectability and validated against NIST known-answer vectors.

import { paramsFor, type MlKemLevel, type MlKemParams } from './params'
import { sha3_256, sha3_512, shake128Xof, shake256, type KeccakSponge } from './sha3'

const N = 256
const Q = 3329

function mod(a: number): number {
  const r = a % Q
  return r < 0 ? r + Q : r
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((acc, p) => acc + p.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

// ---- NTT machinery (zetas derived from ζ = 17 so there is nothing to transcribe) ----

function bitRev7(x: number): number {
  let r = 0
  for (let i = 0; i < 7; i += 1) {
    r = (r << 1) | ((x >> i) & 1)
  }
  return r
}

function powMod(base: number, exp: number): number {
  let result = 1
  let b = mod(base)
  let e = exp
  while (e > 0) {
    if (e & 1) result = mod(result * b)
    b = mod(b * b)
    e >>= 1
  }
  return result
}

const ZETAS: number[] = Array.from({ length: 128 }, (_, i) => powMod(17, bitRev7(i)))
const GAMMAS: number[] = Array.from({ length: 128 }, (_, i) => powMod(17, 2 * bitRev7(i) + 1))

/** Number-Theoretic Transform (FIPS 203 Algorithm 9). Operates on a 256-coefficient poly. */
function ntt(input: number[]): number[] {
  const f = input.slice()
  let k = 1
  for (let len = 128; len >= 2; len >>= 1) {
    for (let start = 0; start < N; start += 2 * len) {
      const zeta = ZETAS[k]!
      k += 1
      for (let j = start; j < start + len; j += 1) {
        const t = mod(zeta * f[j + len]!)
        f[j + len] = mod(f[j]! - t)
        f[j] = mod(f[j]! + t)
      }
    }
  }
  return f
}

/** Inverse NTT (FIPS 203 Algorithm 10). */
function inverseNtt(input: number[]): number[] {
  const f = input.slice()
  let k = 127
  for (let len = 2; len <= 128; len <<= 1) {
    for (let start = 0; start < N; start += 2 * len) {
      const zeta = ZETAS[k]!
      k -= 1
      for (let j = start; j < start + len; j += 1) {
        const t = f[j]!
        f[j] = mod(t + f[j + len]!)
        f[j + len] = mod(zeta * (f[j + len]! - t))
      }
    }
  }
  for (let i = 0; i < N; i += 1) {
    f[i] = mod(f[i]! * 3303) // 3303 = 128^-1 mod q
  }
  return f
}

/** Multiply two NTT-domain polynomials (Algorithms 11/12). */
function multiplyNtt(a: number[], b: number[]): number[] {
  const out = new Array<number>(N)
  for (let i = 0; i < 128; i += 1) {
    const a0 = a[2 * i]!
    const a1 = a[2 * i + 1]!
    const b0 = b[2 * i]!
    const b1 = b[2 * i + 1]!
    const g = GAMMAS[i]!
    out[2 * i] = mod(a0 * b0 + mod(a1 * b1) * g)
    out[2 * i + 1] = mod(a0 * b1 + a1 * b0)
  }
  return out
}

function addPoly(a: number[], b: number[]): number[] {
  const out = new Array<number>(N)
  for (let i = 0; i < N; i += 1) out[i] = mod(a[i]! + b[i]!)
  return out
}

function subPoly(a: number[], b: number[]): number[] {
  const out = new Array<number>(N)
  for (let i = 0; i < N; i += 1) out[i] = mod(a[i]! - b[i]!)
  return out
}

// ---- Encode / decode / compress (FIPS 203 §4.2.1) ----

function byteEncode(poly: number[], d: number): Uint8Array {
  const out = new Uint8Array(32 * d)
  let bit = 0
  for (let i = 0; i < N; i += 1) {
    let v = poly[i]!
    for (let b = 0; b < d; b += 1) {
      if (v & 1) out[bit >> 3] = (out[bit >> 3] ?? 0) | (1 << (bit & 7))
      v >>= 1
      bit += 1
    }
  }
  return out
}

function byteDecode(bytes: Uint8Array, d: number): number[] {
  const m = d < 12 ? 1 << d : Q
  const out = new Array<number>(N)
  let bit = 0
  for (let i = 0; i < N; i += 1) {
    let v = 0
    for (let b = 0; b < d; b += 1) {
      const x = ((bytes[bit >> 3] ?? 0) >> (bit & 7)) & 1
      v |= x << b
      bit += 1
    }
    out[i] = v % m
  }
  return out
}

function compress(poly: number[], d: number): number[] {
  const out = new Array<number>(N)
  const mask = (1 << d) - 1
  for (let i = 0; i < N; i += 1) {
    out[i] = Math.floor((poly[i]! * (1 << d) + Q / 2) / Q) & mask
  }
  return out
}

function decompress(poly: number[], d: number): number[] {
  const out = new Array<number>(N)
  const half = 1 << (d - 1)
  for (let i = 0; i < N; i += 1) {
    out[i] = Math.floor((poly[i]! * Q + half) / (1 << d))
  }
  return out
}

// ---- Sampling ----

/** SampleNTT (Algorithm 7): rejection-sample a uniform NTT-domain poly from a SHAKE128 XOF. */
function sampleNtt(xof: KeccakSponge): number[] {
  const out: number[] = []
  while (out.length < N) {
    const c = xof.squeeze(3)
    const d1 = c[0]! | ((c[1]! & 0x0f) << 8)
    const d2 = (c[1]! >> 4) | (c[2]! << 4)
    if (d1 < Q) out.push(d1)
    if (d2 < Q && out.length < N) out.push(d2)
  }
  return out
}

/** SamplePolyCBD_eta (Algorithm 8): centered binomial distribution from 64*eta bytes. */
function samplePolyCbd(bytes: Uint8Array, eta: number): number[] {
  const out = new Array<number>(N)
  const bitAt = (idx: number): number => ((bytes[idx >> 3] ?? 0) >> (idx & 7)) & 1
  for (let i = 0; i < N; i += 1) {
    let x = 0
    let y = 0
    for (let j = 0; j < eta; j += 1) x += bitAt(2 * i * eta + j)
    for (let j = 0; j < eta; j += 1) y += bitAt(2 * i * eta + eta + j)
    out[i] = mod(x - y)
  }
  return out
}

// ---- Hash / PRF wrappers (FIPS 203 §4.1) ----

const G = sha3_512
const H = sha3_256
const J = (x: Uint8Array): Uint8Array => shake256(x, 32)
const PRF = (eta: number, s: Uint8Array, b: number): Uint8Array => shake256(concat(s, Uint8Array.of(b)), 64 * eta)

// FIPS 203 generates Â[i][j] from XOF(ρ, j, i): the byte AFTER ρ is the column index j,
// then the row index i. (This index order is the documented fix that distinguishes ML-KEM
// from Round-3 Kyber.)
function matrixEntry(rho: Uint8Array, i: number, j: number): number[] {
  return sampleNtt(shake128Xof(concat(rho, Uint8Array.of(j, i))))
}

// ---- K-PKE (FIPS 203 §5) ----

function kpkeKeyGen(p: MlKemParams, d: Uint8Array): { ekPke: Uint8Array; dkPke: Uint8Array } {
  const k = p.k
  const g = G(concat(d, Uint8Array.of(k)))
  const rho = g.subarray(0, 32)
  const sigma = g.subarray(32, 64)

  const aHat: number[][][] = []
  for (let i = 0; i < k; i += 1) {
    aHat[i] = []
    for (let j = 0; j < k; j += 1) aHat[i]![j] = matrixEntry(rho, i, j)
  }

  let nonce = 0
  const sHat: number[][] = []
  const eHat: number[][] = []
  for (let i = 0; i < k; i += 1) sHat[i] = ntt(samplePolyCbd(PRF(p.eta1, sigma, nonce++), p.eta1))
  for (let i = 0; i < k; i += 1) eHat[i] = ntt(samplePolyCbd(PRF(p.eta1, sigma, nonce++), p.eta1))

  const tHat: number[][] = []
  for (let i = 0; i < k; i += 1) {
    let acc = new Array<number>(N).fill(0)
    for (let j = 0; j < k; j += 1) acc = addPoly(acc, multiplyNtt(aHat[i]![j]!, sHat[j]!))
    tHat[i] = addPoly(acc, eHat[i]!)
  }

  const ekPke = concat(...tHat.map((t) => byteEncode(t, 12)), rho)
  const dkPke = concat(...sHat.map((s) => byteEncode(s, 12)))
  return { ekPke, dkPke }
}

function kpkeEncrypt(p: MlKemParams, ekPke: Uint8Array, m: Uint8Array, r: Uint8Array): Uint8Array {
  const k = p.k
  const tHat: number[][] = []
  for (let i = 0; i < k; i += 1) tHat[i] = byteDecode(ekPke.subarray(384 * i, 384 * (i + 1)), 12)
  const rho = ekPke.subarray(384 * k, 384 * k + 32)

  const aHat: number[][][] = []
  for (let i = 0; i < k; i += 1) {
    aHat[i] = []
    for (let j = 0; j < k; j += 1) aHat[i]![j] = matrixEntry(rho, i, j)
  }

  let nonce = 0
  const yHat: number[][] = []
  for (let i = 0; i < k; i += 1) yHat[i] = ntt(samplePolyCbd(PRF(p.eta1, r, nonce++), p.eta1))
  const e1: number[][] = []
  for (let i = 0; i < k; i += 1) e1[i] = samplePolyCbd(PRF(p.eta2, r, nonce++), p.eta2)
  const e2 = samplePolyCbd(PRF(p.eta2, r, nonce++), p.eta2)

  const u: number[][] = []
  for (let i = 0; i < k; i += 1) {
    let acc = new Array<number>(N).fill(0)
    for (let j = 0; j < k; j += 1) acc = addPoly(acc, multiplyNtt(aHat[j]![i]!, yHat[j]!)) // transpose
    u[i] = addPoly(inverseNtt(acc), e1[i]!)
  }

  let vAcc = new Array<number>(N).fill(0)
  for (let i = 0; i < k; i += 1) vAcc = addPoly(vAcc, multiplyNtt(tHat[i]!, yHat[i]!))
  const mu = decompress(byteDecode(m, 1), 1)
  const v = addPoly(addPoly(inverseNtt(vAcc), e2), mu)

  const c1 = concat(...u.map((poly) => byteEncode(compress(poly, p.du), p.du)))
  const c2 = byteEncode(compress(v, p.dv), p.dv)
  return concat(c1, c2)
}

function kpkeDecrypt(p: MlKemParams, dkPke: Uint8Array, c: Uint8Array): Uint8Array {
  const k = p.k
  const c1Len = 32 * p.du * k
  const u: number[][] = []
  for (let i = 0; i < k; i += 1) {
    const slice = c.subarray(32 * p.du * i, 32 * p.du * (i + 1))
    u[i] = decompress(byteDecode(slice, p.du), p.du)
  }
  const v = decompress(byteDecode(c.subarray(c1Len, c1Len + 32 * p.dv), p.dv), p.dv)

  const sHat: number[][] = []
  for (let i = 0; i < k; i += 1) sHat[i] = byteDecode(dkPke.subarray(384 * i, 384 * (i + 1)), 12)

  let acc = new Array<number>(N).fill(0)
  for (let i = 0; i < k; i += 1) acc = addPoly(acc, multiplyNtt(sHat[i]!, ntt(u[i]!)))
  const w = subPoly(v, inverseNtt(acc))
  return byteEncode(compress(w, 1), 1)
}

// ---- ML-KEM internal (deterministic) functions (FIPS 203 §6) ----

export type MlKemInternalKeys = { ek: Uint8Array; dk: Uint8Array }

export function mlkemKeyGenInternal(level: MlKemLevel, d: Uint8Array, z: Uint8Array): MlKemInternalKeys {
  const p = paramsFor(level)
  const { ekPke, dkPke } = kpkeKeyGen(p, d)
  const ek = ekPke
  const dk = concat(dkPke, ek, H(ek), z)
  return { ek, dk }
}

export function mlkemEncapsInternal(
  level: MlKemLevel,
  ek: Uint8Array,
  m: Uint8Array,
): { sharedSecret: Uint8Array; ciphertext: Uint8Array } {
  const p = paramsFor(level)
  const g = G(concat(m, H(ek)))
  const sharedSecret = g.subarray(0, 32)
  const r = g.subarray(32, 64)
  const ciphertext = kpkeEncrypt(p, ek, m, r)
  return { sharedSecret: new Uint8Array(sharedSecret), ciphertext }
}

export function mlkemDecapsInternal(level: MlKemLevel, dk: Uint8Array, c: Uint8Array): Uint8Array {
  const p = paramsFor(level)
  const k = p.k
  const dkPke = dk.subarray(0, 384 * k)
  const ek = dk.subarray(384 * k, 768 * k + 32)
  const h = dk.subarray(768 * k + 32, 768 * k + 64)
  const z = dk.subarray(768 * k + 64, 768 * k + 96)

  const mPrime = kpkeDecrypt(p, dkPke, c)
  const g = G(concat(mPrime, h))
  let kPrime = g.subarray(0, 32)
  const r = g.subarray(32, 64)
  const kBar = J(concat(z, c))
  const cPrime = kpkeEncrypt(p, ek, mPrime, r)

  // Implicit rejection: constant-time-style select on ciphertext mismatch.
  let mismatch = c.length === cPrime.length ? 0 : 1
  for (let i = 0; i < c.length && i < cPrime.length; i += 1) mismatch |= (c[i] ?? 0) ^ (cPrime[i] ?? 0)
  if (mismatch !== 0) kPrime = kBar
  return new Uint8Array(kPrime)
}

// Real ML-KEM NTT primitives, exposed so the side-channel replays can leak from genuine
// lattice arithmetic rather than a stand-in. Each operates on a 256-coefficient polynomial
// with coefficients in [0, q).
export const ML_KEM_Q = Q
export const nttForward = ntt
export const nttInverse = inverseNtt
/** Pointwise multiply of two NTT-domain polynomials (the operation ŝ ∘ NTT(u) in decapsulation). */
export const nttPointwiseMultiply = multiplyNtt

/**
 * One base-case multiply from FIPS 203 Algorithm 12: the degree-1 product
 * (a0 + a1·X)·(b0 + b1·X) mod (X² − ζ^(2·BitRev7(i)+1)) for NTT pair `pairIndex`.
 * This is the exact arithmetic an ML-KEM implementation performs per coefficient pair.
 */
export function nttBaseMultiply(a0: number, a1: number, b0: number, b1: number, pairIndex: number): [number, number] {
  const g = GAMMAS[pairIndex]!
  return [mod(a0 * b0 + mod(a1 * b1) * g), mod(a0 * b1 + a1 * b0)]
}

/** Infer the ML-KEM parameter set from an encapsulation- or decapsulation-key length. */
export function levelFromKeyLength(length: number): MlKemLevel {
  if (length === 800 || length === 1632) return 512
  if (length === 1184 || length === 2400) return 768
  if (length === 1568 || length === 3168) return 1024
  throw new Error(`Unrecognized ML-KEM key length: ${length}`)
}
