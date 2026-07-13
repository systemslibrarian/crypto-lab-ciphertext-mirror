/**
 * A tiny, fully-honest LDPC belief-propagation example, sized for a diagram.
 *
 * The DF-oracle card asserts the single most counterintuitive claim in the lab: a
 * coin-flip-noisy oracle still recovers the key, because parity checks correct residual
 * errors that per-coefficient voting alone cannot. The full sim proves this at scale but
 * shows only the *outcome* curve. This module runs the same sum-product update on a 6-bit
 * toy so the mechanism can be animated: one variable starts with WRONG channel evidence,
 * and two parity checks it participates in — each satisfied by the *true* assignment —
 * pull its belief back across BP iterations.
 *
 * Everything returned is computed by the standard tanh-rule sum-product algorithm; nothing
 * is scripted to a predetermined answer. Change the toy and the trajectory changes with it.
 */

/** LLR sign convention: LLR > 0 ⇒ bit 0, LLR < 0 ⇒ bit 1 (matches the full DF sim). */
export type ToyBpToy = {
  /** True secret bits the toy is built around. */
  secret: number[]
  /** Channel LLR prior per variable (may disagree with the secret to model a bad reading). */
  channelLlr: number[]
  /** Parity checks: each is a set of variable indices; the check observes their XOR. */
  checks: number[][]
}

export type ToyBpFrame = {
  iteration: number
  /** Marginal LLR per variable at this iteration. */
  marginals: number[]
  /** Hard decision per variable (0/1) from the marginal sign. */
  decisions: number[]
  /** Which variables currently match the true secret. */
  correct: boolean[]
  /** Check → variable messages, indexed [checkIndex][edgeIndex]. */
  checkToVar: number[][]
}

function clampTanh(x: number): number {
  return Math.max(-0.999999, Math.min(0.999999, x))
}

/**
 * The canonical toy: 6 variables, secret = [0,1,0,1,1,0]. Variable 2's channel evidence is
 * flipped (it "reads" as 1 with modest confidence). Two degree-3 parity checks both contain
 * variable 2 and are satisfied by the true secret, so once the other variables settle the
 * checks agree that v2 must flip back to 0. This is the "two agreeing parity checks fix a
 * wrong guess" story, made concrete.
 */
export function canonicalToy(): ToyBpToy {
  const secret = [0, 1, 0, 1, 1, 0]
  // Confident-and-correct priors everywhere except v2, which is confidently WRONG.
  const channelLlr = [
    +2.2, // v0 → 0 (correct)
    -2.0, // v1 → 1 (correct)
    -1.4, // v2 → 1 (WRONG: truth is 0) — the error BP must repair
    -2.0, // v3 → 1 (correct)
    -1.8, // v4 → 1 (correct)
    +2.2, // v5 → 0 (correct)
  ]
  // Two checks that both couple v2 and are satisfied by the true secret:
  //   c0: v0 ⊕ v2 ⊕ v3 = 0 ⊕ 0 ⊕ 1 = 1
  //   c1: v1 ⊕ v2 ⊕ v4 = 1 ⊕ 0 ⊕ 1 = 0
  const checks = [
    [0, 2, 3],
    [1, 2, 4],
  ]
  return { secret, channelLlr, checks }
}

/** Parity (0/1) of a check under the true secret — the noiseless observation the toy uses. */
function checkObservation(secret: number[], vars: number[]): 0 | 1 {
  let p = 0
  for (const v of vars) p ^= secret[v] ?? 0
  return (p & 1) as 0 | 1
}

/**
 * Run sum-product BP on the toy and return a frame per iteration (iteration 0 = channel
 * priors only, before any message passing). Standard tanh-rule updates, identical in form
 * to the full DF-oracle decoder.
 */
export function runToyBp(toy: ToyBpToy, iterations = 6): ToyBpFrame[] {
  const n = toy.channelLlr.length
  const checks = toy.checks
  const obs = checks.map((vars) => checkObservation(toy.secret, vars))
  // High reliability on the (noiseless) toy parity observations.
  const reliability = Math.log((1 - 0.02) / 0.02)

  const incident: Array<Array<[number, number]>> = Array.from({ length: n }, () => [])
  const varToCheck: number[][] = checks.map((c) => c.map(() => 0))
  const checkToVar: number[][] = checks.map((c) => c.map(() => 0))
  checks.forEach((vars, ci) => vars.forEach((v, ei) => incident[v]!.push([ci, ei])))

  // Seed variable→check messages with the channel prior.
  checks.forEach((vars, ci) =>
    vars.forEach((v, ei) => {
      varToCheck[ci]![ei] = toy.channelLlr[v] ?? 0
    }),
  )

  const frames: ToyBpFrame[] = []

  const snapshot = (iteration: number): void => {
    const marginals: number[] = []
    const decisions: number[] = []
    const correct: boolean[] = []
    for (let v = 0; v < n; v += 1) {
      let m = toy.channelLlr[v] ?? 0
      for (const [ci, ei] of incident[v]!) m += checkToVar[ci]![ei]!
      marginals.push(m)
      const d = m >= 0 ? 0 : 1
      decisions.push(d)
      correct.push(d === (toy.secret[v] ?? 0))
    }
    frames.push({
      iteration,
      marginals,
      decisions,
      correct,
      checkToVar: checkToVar.map((row) => row.slice()),
    })
  }

  snapshot(0)

  for (let iter = 1; iter <= iterations; iter += 1) {
    // Check → variable.
    checks.forEach((vars, ci) => {
      const t0 = Math.tanh((obs[ci] === 0 ? reliability : -reliability) / 2)
      for (let ei = 0; ei < vars.length; ei += 1) {
        let prod = t0
        for (let ej = 0; ej < vars.length; ej += 1) {
          if (ej !== ei) prod *= Math.tanh(varToCheck[ci]![ej]! / 2)
        }
        checkToVar[ci]![ei] = 2 * Math.atanh(clampTanh(prod))
      }
    })
    // Variable → check.
    for (let v = 0; v < n; v += 1) {
      let total = toy.channelLlr[v] ?? 0
      for (const [ci, ei] of incident[v]!) total += checkToVar[ci]![ei]!
      for (const [ci, ei] of incident[v]!) varToCheck[ci]![ei] = total - checkToVar[ci]![ei]!
    }
    snapshot(iter)
  }

  return frames
}
