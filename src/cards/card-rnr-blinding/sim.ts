import { applyRnrMask, detectSingleBitFault, removeRnrMask } from '../../lib/leakage/blinding'
import { hammingWeightByte } from '../../lib/leakage/model'
import { ML_KEM_Q, nttBaseMultiply } from '../../lib/mlkem/fips203'
import { seedToBigInt, Xoshiro256 } from '../../lib/prng/xoshiro256'

export type BlindingResult = {
  /** Running |CPA correlation| between leakage and the correct-key hypothesis, unblinded path. */
  unblindedCorrelation: number[]
  /** Same distinguisher against the RNR-blinded path — collapses toward zero. */
  blindedCorrelation: number[]
  unblindedState: 'OK' | 'TAMPERED'
  blindedState: 'OK' | 'ABORT'
}

/** Traces accumulated for the CPA correlation estimate. */
const ESTIMATION_TRACES = 4_000

/** Running-correlation samples recorded for the buildup chart. */
const CURVE_POINTS = 64

/** Which NTT coefficient pair the attacker targets (FIPS 203 Algorithm 12 base case). */
const TARGET_PAIR = 3

function boxMuller(prng: Xoshiro256): number {
  const u1 = Math.max(prng.nextFloat(), 1e-12)
  const u2 = prng.nextFloat()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

type CorrAcc = { sx: number; sy: number; sxx: number; syy: number; sxy: number }

function accumulate(acc: CorrAcc, leak: number, hypothesis: number): void {
  acc.sx += leak
  acc.sy += hypothesis
  acc.sxx += leak * leak
  acc.syy += hypothesis * hypothesis
  acc.sxy += leak * hypothesis
}

function correlation(acc: CorrAcc, n: number): number {
  const num = n * acc.sxy - acc.sx * acc.sy
  const den = Math.sqrt((n * acc.sxx - acc.sx * acc.sx) * (n * acc.syy - acc.sy * acc.sy))
  return den === 0 ? 0 : Math.abs(num / den)
}

/**
 * Matched A/B replay of NTT+CRT RNR blinding (ePrint 2025/181).
 *
 * Side-channel facet — a correlation power-analysis (CPA) distinguisher, evaluated at
 * the correct-key hypothesis, on the genuine ML-KEM NTT base-case multiply (FIPS 203
 * Algorithm 12): the secret coefficient pair (ŝ0, ŝ1) is multiplied by an
 * attacker-influenced input pair (û0, û1) that varies each trace. (A full CPA would rank
 * every candidate key; here we track the correct hypothesis to show whether it leaks.)
 *   - Unblinded: the device leaks HW(product). The attacker predicts that same product
 *     under the correct key, so the correlation climbs — the secret leaks.
 *   - Blinded: RNR adds a fresh random field element to the product before it is
 *     processed, so the leakage no longer tracks the prediction and the correlation
 *     collapses. The reduction is emergent from the randomization, not a scaling constant.
 *
 * Fault facet — the blinded pipeline re-derives and checks the value; a single injected
 * bit flip is caught (ABORT) while an unblinded pipeline returns a TAMPERED result.
 */
export function runBlindingSim(seedText: string, sigma: number, injectFault: boolean): BlindingResult {
  const prng = new Xoshiro256(seedToBigInt(seedText))

  // The fixed secret NTT coefficient pair the attacker is trying to confirm via leakage.
  const s0 = prng.nextU32() % ML_KEM_Q
  const s1 = prng.nextU32() % ML_KEM_Q

  const unblindedAcc: CorrAcc = { sx: 0, sy: 0, sxx: 0, syy: 0, sxy: 0 }
  const blindedAcc: CorrAcc = { sx: 0, sy: 0, sxx: 0, syy: 0, sxy: 0 }
  const unblindedCorrelation: number[] = []
  const blindedCorrelation: number[] = []

  const sampleEvery = Math.max(1, Math.floor(ESTIMATION_TRACES / CURVE_POINTS))

  for (let t = 1; t <= ESTIMATION_TRACES; t += 1) {
    const u0 = prng.nextU32() % ML_KEM_Q
    const u1 = prng.nextU32() % ML_KEM_Q
    const [product] = nttBaseMultiply(s0, s1, u0, u1, TARGET_PAIR)
    const mask = prng.nextU32() % ML_KEM_Q

    // Attacker's prediction for the correct key is the unblinded product's Hamming weight.
    const hypothesis = hammingWeightByte(product & 0xff)

    accumulate(unblindedAcc, hammingWeightByte(product & 0xff) + boxMuller(prng) * sigma, hypothesis)
    accumulate(
      blindedAcc,
      hammingWeightByte(((product + mask) % ML_KEM_Q) & 0xff) + boxMuller(prng) * sigma,
      hypothesis,
    )

    if (t % sampleEvery === 0 || t === ESTIMATION_TRACES) {
      unblindedCorrelation.push(correlation(unblindedAcc, t))
      blindedCorrelation.push(correlation(blindedAcc, t))
    }
  }

  // Fault facet: the blinded path's redundant check catches a single-bit fault.
  const coeffs = new Int16Array(64)
  for (let i = 0; i < coeffs.length; i += 1) {
    coeffs[i] = (prng.nextU32() % ML_KEM_Q) - 1664
  }
  const { masked, mask } = applyRnrMask(coeffs, prng)
  const recovered = removeRnrMask(masked, mask)

  const recoveredBytes = new Uint8Array(recovered.length)
  for (let i = 0; i < recovered.length; i += 1) {
    recoveredBytes[i] = (recovered[i] ?? 0) & 0xff
  }
  const tampered = recoveredBytes.slice()
  if (injectFault && tampered.length > 0) {
    tampered[0] = (tampered[0] ?? 0) ^ 0x01
  }
  const faultDetected = detectSingleBitFault(recoveredBytes, tampered)

  return {
    unblindedCorrelation,
    blindedCorrelation,
    unblindedState: injectFault ? 'TAMPERED' : 'OK',
    blindedState: faultDetected ? 'ABORT' : 'OK',
  }
}
