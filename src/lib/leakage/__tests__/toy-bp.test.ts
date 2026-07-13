import { describe, expect, test } from 'vitest'
import { canonicalToy, runToyBp } from '../toy-bp'

describe('toy Tanner-graph belief propagation', () => {
  test('the canonical toy starts with exactly one wrong bit (v2)', () => {
    const frames = runToyBp(canonicalToy())
    const start = frames[0]!
    const wrong = start.correct.map((ok, i) => (ok ? -1 : i)).filter((i) => i >= 0)
    expect(wrong).toEqual([2])
    // v2's channel prior really does point the wrong way (LLR < 0 ⇒ decides bit 1, truth 0).
    expect(start.decisions[2]).toBe(1)
  })

  test('parity checks repair the wrong bit — all six bits correct after BP', () => {
    const frames = runToyBp(canonicalToy())
    const final = frames[frames.length - 1]!
    expect(final.correct.every(Boolean)).toBe(true)
    // The repaired marginal for v2 flips sign (now decides bit 0 = truth).
    expect(final.decisions[2]).toBe(0)
    expect(final.marginals[2]!).toBeGreaterThan(0)
  })

  test('the correction is driven by message passing, not the channel prior alone', () => {
    const toy = canonicalToy()
    // With no checks, the (wrong) channel prior would never be overturned.
    const noChecks = runToyBp({ ...toy, checks: [] })
    expect(noChecks[noChecks.length - 1]!.correct[2]).toBe(false)
    // Adding the two parity checks is what fixes it.
    const withChecks = runToyBp(toy)
    expect(withChecks[withChecks.length - 1]!.correct[2]).toBe(true)
  })

  test('a frame is recorded per iteration (including the initial channel-only frame)', () => {
    const frames = runToyBp(canonicalToy(), 6)
    expect(frames).toHaveLength(7)
    expect(frames[0]!.iteration).toBe(0)
    expect(frames[6]!.iteration).toBe(6)
  })
})
