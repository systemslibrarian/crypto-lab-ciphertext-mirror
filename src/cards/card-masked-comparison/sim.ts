import { booleanMaskByte } from '../../lib/leakage/masking'
import { mlKemDecaps, mlKemEncaps, mlKemKeyGen } from '../../lib/mlkem/kem'
import { seedToBigInt, Xoshiro256 } from '../../lib/prng/xoshiro256'
import type { MlKemLevel } from '../../components/types'

export type MaskedRunOutput = {
  /** Running |correlation| of the higher-order distinguisher as traces accumulate, per masking order. */
  curves: Record<0 | 1 | 2 | 3, number[]>
  /** Estimated traces to reach 95% confidence, per masking order. */
  tracesNeeded95: Record<0 | 1 | 2 | 3, number>
  /** Global index (0..secretBits-1) of the real shared-secret bit this run resolved. */
  targetIndex: number
  /** The actual value (0/1) of that recovered ML-KEM shared-secret bit. */
  targetBit: number
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

/** One share of a single concrete trace, exposed for the mechanism strip. */
export type ShareStep = {
  /** The Boolean share bit (0/1) the device holds. */
  bit: number
  /** Centered Hamming weight of that bit: bit - 0.5. */
  centered: number
  /** Gaussian measurement noise added to this share's leak this trace. */
  noise: number
  /** What the attacker actually measures for this share: centered + noise. */
  leak: number
}

/** One concrete attacker trace, decomposed into its share→leak→combine steps. */
export type MechanismTrace = {
  /** Decision bit the device processed this trace (targetBit XOR induced toggle). */
  decisionBit: number
  /** The masking order d used for this trace (d+1 shares). */
  order: number
  /** Per-share breakdown; XOR of the share bits equals decisionBit. */
  shares: ShareStep[]
  /** Product of the per-share leaks — the higher-order distinguisher for this trace. */
  distinguisher: number
}

/** A short, honest walkthrough: the same model as the full sim, one trace at a time. */
export type MechanismSample = {
  /** The one real ML-KEM shared-secret bit being resolved (0/1). */
  targetBit: number
  /** Global secret-bit index this run targets. */
  targetIndex: number
  /** The masking order this walkthrough illustrates. */
  order: number
  /** Noise sigma used for the walkthrough leaks. */
  sigma: number
  /** A handful of concrete traces, each fully decomposed. */
  traces: MechanismTrace[]
  /** Running |correlation| between distinguisher and decision bit after each trace. */
  runningCorrelation: number[]
}

/**
 * Produce a small, fully-decomposed walkthrough of the SAME higher-order CPA the full
 * replay runs — one trace at a time, showing each share, its Hamming-weight + Gaussian-noise
 * leak, and the product distinguisher. This is not a separate toy: it calls the identical
 * masking (`booleanMaskByte`) and leakage model (`(share-0.5)+noise*sigma`, product combiner)
 * used inside `runMaskedComparisonSim`, so what the strip shows is exactly what the bar chart
 * later measures — just made visible for a handful of traces instead of tens of thousands.
 */
export async function sampleMaskingMechanism(
  level: MlKemLevel,
  seedText: string,
  sigma: number,
  bitIndex: number,
  order: number,
  traceCount = 6,
): Promise<MechanismSample> {
  const keyPair = await mlKemKeyGen(level, seedText)
  const encaps = await mlKemEncaps(keyPair.pk, `${seedText}:encap`)
  const sharedSecret = await mlKemDecaps(keyPair.sk, keyPair.z, encaps.ciphertext)
  const secretBitLength = sharedSecret.length * 8

  const targetIndex = ((bitIndex % secretBitLength) + secretBitLength) % secretBitLength
  const targetByte = sharedSecret[targetIndex >> 3] ?? 0
  const targetBit = (targetByte >> (targetIndex & 7)) & 1

  // Same seed stream shape as the full sim so the walkthrough is a faithful prefix.
  const prng = new Xoshiro256(seedToBigInt(`${seedText}:L${level}:bit${targetIndex}:order:${order}`))

  const traces: MechanismTrace[] = []
  const runningCorrelation: number[] = []
  let sx = 0
  let sy = 0
  let sxx = 0
  let syy = 0
  let sxy = 0

  for (let t = 1; t <= traceCount; t += 1) {
    const induced = prng.nextFloat() < 0.5 ? 0 : 1
    const decisionBit = targetBit ^ induced
    const shareBytes = booleanMaskByte(decisionBit, order, prng)

    let combined = 1
    const shares: ShareStep[] = []
    for (let i = 0; i < shareBytes.length; i += 1) {
      const bit = (shareBytes[i] ?? 0) & 1
      const centered = bit - 0.5
      const noise = boxMuller(prng) * sigma
      const leak = centered + noise
      combined *= leak
      shares.push({ bit, centered, noise, leak })
    }

    traces.push({ decisionBit, order, shares, distinguisher: combined })

    sx += combined
    sy += decisionBit
    sxx += combined * combined
    syy += decisionBit * decisionBit
    sxy += combined * decisionBit
    const num = t * sxy - sx * sy
    const den = Math.sqrt((t * sxx - sx * sx) * (t * syy - sy * sy))
    runningCorrelation.push(den === 0 ? 0 : Math.abs(num / den))
  }

  return { targetBit, targetIndex, order, sigma, traces, runningCorrelation }
}

/**
 * Faithful higher-order CPA against a Boolean-masked decision bit.
 *
 * Model (per query trace t):
 *   - The attack targets one real bit of the ML-KEM shared secret (`targetBit`, chosen by
 *     the "Target bit" control). Each trace the attacker submits a chosen ciphertext that
 *     toggles the masked comparison, so the device's decision bit b_t = targetBit XOR
 *     toggle varies across traces; resolving the correlation recovers the genuine key bit.
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
  // Run the real pedagogical ML-KEM. Decapsulation yields the genuine shared secret;
  // its bits are the values the masked FO comparison protects, so the higher-order CPA
  // below is recovering real ML-KEM secret bits rather than a bare synthetic coin.
  const keyPair = await mlKemKeyGen(level, seedText)
  const encaps = await mlKemEncaps(keyPair.pk, `${seedText}:encap`)
  const sharedSecret = await mlKemDecaps(keyPair.sk, keyPair.z, encaps.ciphertext)
  const secretBitLength = sharedSecret.length * 8

  // The single real shared-secret bit this run attacks — selected by the "Target bit"
  // control. Recovering any one bit costs the same in this idealized model, so the
  // control changes which genuine key bit is resolved, not the difficulty.
  const targetIndex = ((bitIndex % secretBitLength) + secretBitLength) % secretBitLength
  const targetByte = sharedSecret[targetIndex >> 3] ?? 0
  const targetBit = (targetByte >> (targetIndex & 7)) & 1

  const curves: Record<0 | 1 | 2 | 3, number[]> = { 0: [], 1: [], 2: [], 3: [] }
  const tracesNeeded95: Record<0 | 1 | 2 | 3, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }

  const sampleEvery = Math.max(1, Math.floor(ESTIMATION_TRACES / CURVE_POINTS))

  for (const order of [0, 1, 2, 3] as const) {
    // Level and target bit feed the seed stream so each order's trace set is independent
    // and deterministic.
    const prng = new Xoshiro256(seedToBigInt(`${seedText}:L${level}:bit${targetIndex}:order:${order}`))

    // Running sums for the point-biserial correlation between the combined
    // distinguisher value and the secret decision bit.
    let sx = 0
    let sy = 0
    let sxx = 0
    let syy = 0
    let sxy = 0

    for (let t = 1; t <= ESTIMATION_TRACES; t += 1) {
      // Each trace the attacker submits a chosen ciphertext that toggles the masked
      // comparison's outcome ~half the time. The device's decision bit is the targeted
      // genuine secret bit XOR that known toggle, so it varies across traces (which the
      // point-biserial correlation needs) while the value the CPA resolves is the real
      // ML-KEM key bit `targetBit`.
      const induced = prng.nextFloat() < 0.5 ? 0 : 1
      const decisionBit = targetBit ^ induced
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

  return { curves, tracesNeeded95, targetIndex, targetBit }
}
