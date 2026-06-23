import { booleanMaskByte } from '../../lib/leakage/masking'
import { mlKemDecaps, mlKemEncaps, mlKemKeyGen } from '../../lib/mlkem/kem'
import { seedToBigInt, Xoshiro256 } from '../../lib/prng/xoshiro256'
import type { MlKemLevel } from '../../components/types'

export type MaskedRunOutput = {
  /** Running |correlation| of the higher-order distinguisher as traces accumulate, per masking order. */
  curves: Record<0 | 1 | 2 | 3, number[]>
  /** Estimated traces to reach 95% confidence, per masking order. */
  tracesNeeded95: Record<0 | 1 | 2 | 3, number>
}

/**
 * Number of synthetic traces used to estimate the distinguisher correlation.
 * Large enough that the low/mid-order estimates are stable run-to-run.
 */
const ESTIMATION_TRACES = 40_000

/** How many running-correlation samples to record for the trace-buildup chart. */
const CURVE_POINTS = 64

/** 95%-confidence z-score used to turn a correlation into a trace-count estimate. */
const Z_95 = 1.96

/**
 * Below this correlation the synthetic channel carries no usable signal in this
 * replay window. It caps the trace estimate so an effectively-defended order
 * reports "out of replay reach" instead of a meaningless astronomically large number.
 */
export const CORRELATION_FLOOR = 5e-4

/**
 * Pedagogical scale factor mapping the idealized single-bit distinguisher count
 * onto a realistic order-of-magnitude. It folds in acquisition repetition and the
 * number of independent recoveries a real campaign needs per secret. It changes the
 * absolute numbers, never the *shape* of the order-vs-noise story. Documented in
 * KNOWN-GAPS.md as an illustrative constant, not a measured break cost.
 */
export const TRACE_SCALE = 1_000

/** Largest trace estimate this replay will report (correlation pinned at the floor). */
export const MAX_TRACE_ESTIMATE = Math.ceil((Z_95 / CORRELATION_FLOOR) ** 2) * TRACE_SCALE

function tracesFromCorrelation(correlation: number): number {
  const r = Math.max(Math.abs(correlation), CORRELATION_FLOOR)
  return Math.min(Math.ceil((Z_95 / r) ** 2) * TRACE_SCALE, MAX_TRACE_ESTIMATE)
}

function boxMuller(prng: Xoshiro256): number {
  const u1 = Math.max(prng.nextFloat(), 1e-12)
  const u2 = prng.nextFloat()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

/**
 * Faithful higher-order CPA against a Boolean-masked decision bit.
 *
 * Model (per query trace t):
 *   - The masked FO comparison produces a secret decision bit b_t (varies across
 *     adaptively chosen ciphertexts; it is the value the attacker is trying to predict).
 *   - The device splits b_t into d+1 Boolean shares (XOR of the shares = b_t).
 *   - Each share leaks its centered Hamming weight plus Gaussian noise N(0, sigma):
 *         leak_i = (share_i - 0.5) + noise_i
 *   - First-order leakage of any single share is independent of b_t, so the attacker
 *     must combine shares. The optimal distinguisher for Boolean masking is the
 *     **product of the centered share leakages**, whose mean depends on b_t.
 *
 * The number of traces to win scales like SNR^-(d+1): it grows exponentially with
 * masking order d AND the gap between orders widens as noise rises. That coupling is
 * the whole lesson of ePrint 2024/060 — masking order alone is not a sufficient defense.
 */
export async function runMaskedComparisonSim(
  level: MlKemLevel,
  seedText: string,
  sigma: number,
  bitIndex: number,
): Promise<MaskedRunOutput> {
  // Run the real pedagogical ML-KEM so the replay is grounded in an actual
  // keygen/encaps/decaps round-trip rather than a bare formula.
  const keyPair = await mlKemKeyGen(level, seedText)
  const encaps = await mlKemEncaps(keyPair.pk, `${seedText}:encap`)
  await mlKemDecaps(keyPair.sk, keyPair.z, encaps.ciphertext)

  const curves: Record<0 | 1 | 2 | 3, number[]> = { 0: [], 1: [], 2: [], 3: [] }
  const tracesNeeded95: Record<0 | 1 | 2 | 3, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }

  const sampleEvery = Math.max(1, Math.floor(ESTIMATION_TRACES / CURVE_POINTS))

  for (const order of [0, 1, 2, 3] as const) {
    // Level and target bit feed the seed stream so the controls stay live and
    // deterministic without changing the underlying physics of the lesson.
    const prng = new Xoshiro256(seedToBigInt(`${seedText}:L${level}:bit${bitIndex}:order:${order}`))

    // Running sums for the point-biserial correlation between the combined
    // distinguisher value and the secret decision bit.
    let sx = 0
    let sy = 0
    let sxx = 0
    let syy = 0
    let sxy = 0

    for (let t = 1; t <= ESTIMATION_TRACES; t += 1) {
      const decisionBit = prng.nextFloat() < 0.5 ? 0 : 1
      const shares = booleanMaskByte(decisionBit, order, prng)

      // Product of centered share leakages = optimal Boolean-masking distinguisher.
      let combined = 1
      for (let i = 0; i < shares.length; i += 1) {
        const shareBit = (shares[i] ?? 0) & 1
        combined *= shareBit - 0.5 + boxMuller(prng) * sigma
      }

      sx += combined
      sy += decisionBit
      sxx += combined * combined
      syy += decisionBit * decisionBit
      sxy += combined * decisionBit

      if (t % sampleEvery === 0 || t === ESTIMATION_TRACES) {
        const num = t * sxy - sx * sy
        const den = Math.sqrt((t * sxx - sx * sx) * (t * syy - sy * sy))
        curves[order].push(den === 0 ? 0 : Math.abs(num / den))
      }
    }

    const finalCorrelation = curves[order][curves[order].length - 1] ?? 0
    tracesNeeded95[order] = tracesFromCorrelation(finalCorrelation)
  }

  return { curves, tracesNeeded95 }
}
