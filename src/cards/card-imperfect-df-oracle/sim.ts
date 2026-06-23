import { imperfectOracle } from '../../lib/leakage/df-oracle'
import { seedToBigInt, Xoshiro256 } from '../../lib/prng/xoshiro256'

export type DfRunResult = {
  recoveredOverQueries: number[]
  variables: { id: string; confidence: number }[]
}

/** Number of secret coefficients the attack is trying to resolve. */
const SECRET_LEN = 64
/** Degree of each LDPC parity check (number of secret bits it couples). */
const CHECK_DEGREE = 6
/** Fraction of queries spent on direct adaptive observations vs LDPC parity checks. */
const DIRECT_FRACTION = 0.6
/** Belief-propagation iterations per decode. */
const BP_ITERS = 40
/** Running-recovery samples recorded for the convergence chart. */
const CURVE_POINTS = 64

type Check = { vars: number[]; obs: 0 | 1 }

function clampTanh(x: number): number {
  return Math.max(-0.999999, Math.min(0.999999, x))
}

/**
 * Sum-product belief propagation over the Tanner graph: variable nodes carry the
 * channel LLRs from direct observations, check nodes enforce the noisy LDPC parities.
 * Returns the marginal LLR per secret bit (LLR > 0 ⇒ bit 0).
 */
function beliefPropagation(checks: Check[], channel: Float64Array, reliability: number): Float64Array {
  const incident: Array<Array<[number, number]>> = Array.from({ length: SECRET_LEN }, () => [])
  const varToCheck: number[][] = checks.map((c) => c.vars.map(() => 0))
  const checkToVar: number[][] = checks.map((c) => c.vars.map(() => 0))
  checks.forEach((c, ci) => c.vars.forEach((v, ei) => incident[v]!.push([ci, ei])))

  for (let iter = 0; iter < BP_ITERS; iter += 1) {
    // Check → variable: the parity constraint, tempered by the observation's reliability.
    checks.forEach((c, ci) => {
      const t0 = Math.tanh((c.obs === 0 ? reliability : -reliability) / 2)
      for (let ei = 0; ei < c.vars.length; ei += 1) {
        let prod = t0
        for (let ej = 0; ej < c.vars.length; ej += 1) {
          if (ej !== ei) prod *= Math.tanh(varToCheck[ci]![ej]! / 2)
        }
        checkToVar[ci]![ei] = 2 * Math.atanh(clampTanh(prod))
      }
    })
    // Variable → check: channel prior plus all other incoming check messages.
    for (let v = 0; v < SECRET_LEN; v += 1) {
      let total = channel[v]!
      for (const [ci, ei] of incident[v]!) total += checkToVar[ci]![ei]!
      for (const [ci, ei] of incident[v]!) varToCheck[ci]![ei] = total - checkToVar[ci]![ei]!
    }
  }

  const marginal = Float64Array.from(channel)
  for (let v = 0; v < SECRET_LEN; v += 1) {
    for (const [ci, ei] of incident[v]!) marginal[v]! += checkToVar[ci]![ei]!
  }
  return marginal
}

/**
 * Hybrid Adaptive-LDPC decryption-failure-oracle attack (ePrint 2026/070, abstracted).
 *
 * Each query is one of two kinds, through a binary symmetric channel (error pErr,
 * availability alpha):
 *   - Adaptive direct observation of the least-confident secret coefficient, accumulated
 *     as a per-coefficient log-likelihood ratio (the "Adaptive" half).
 *   - A random degree-6 parity check over the secret coefficients (the "LDPC" half).
 * Belief propagation then fuses the channel LLRs with the parity constraints. The parity
 * checks correct residual errors that per-coefficient voting alone cannot, so recovery
 * climbs for pErr < 0.5 and stalls toward 50% as pErr → 0.5; availability sets the rate.
 */
export function runDfOracleSim(seedText: string, pErr: number, alpha: number, queryBudget: number): DfRunResult {
  const prng = new Xoshiro256(seedToBigInt(seedText))

  const secret = new Int8Array(SECRET_LEN)
  for (let i = 0; i < SECRET_LEN; i += 1) secret[i] = prng.nextFloat() > 0.5 ? 1 : 0

  const pClamped = Math.max(0.001, Math.min(0.499, pErr))
  const reliability = Math.log((1 - pClamped) / pClamped)

  const channel = new Float64Array(SECRET_LEN)
  const checks: Check[] = []
  const recoveredOverQueries: number[] = []
  const sampleEvery = Math.max(1, Math.floor(queryBudget / CURVE_POINTS))

  const decodeAndScore = (): number => {
    const marginal = checks.length > 0 ? beliefPropagation(checks, channel, reliability) : channel
    let recovered = 0
    for (let i = 0; i < SECRET_LEN; i += 1) {
      const guess = marginal[i]! >= 0 ? 0 : 1
      if (guess === secret[i]) recovered += 1
    }
    return recovered / SECRET_LEN
  }

  for (let q = 0; q < queryBudget; q += 1) {
    if (prng.nextFloat() < DIRECT_FRACTION) {
      // Adaptive: spend this query on the coefficient we are least sure about.
      let target = 0
      let lowest = Number.POSITIVE_INFINITY
      for (let i = 0; i < SECRET_LEN; i += 1) {
        const conf = Math.abs(channel[i]!)
        if (conf < lowest) {
          lowest = conf
          target = i
        }
      }
      const answer = imperfectOracle((secret[target] ?? 0) as 0 | 1, pErr, alpha, prng)
      if (answer.available) channel[target]! += answer.bit === 0 ? reliability : -reliability
    } else {
      // LDPC: a random parity check coupling several coefficients.
      const vars: number[] = []
      while (vars.length < CHECK_DEGREE) {
        const x = prng.nextU32() % SECRET_LEN
        if (!vars.includes(x)) vars.push(x)
      }
      let parity = 0
      for (const v of vars) parity ^= secret[v] ?? 0
      const answer = imperfectOracle(parity as 0 | 1, pErr, alpha, prng)
      if (answer.available) checks.push({ vars, obs: answer.bit })
    }

    if (q % sampleEvery === 0 || q === queryBudget - 1) recoveredOverQueries.push(decodeAndScore())
  }

  const finalMarginal = checks.length > 0 ? beliefPropagation(checks, channel, reliability) : channel
  const variables = Array.from(finalMarginal, (value, index) => ({
    id: `v${index}`,
    confidence: Math.tanh(Math.abs(value) / 4),
  }))

  return { recoveredOverQueries, variables }
}
