import { describe, expect, test } from 'vitest'
import { runBlindingSim } from '../sim'

function finalValue(curve: number[]): number {
  return curve[curve.length - 1] ?? 0
}

describe('RNR blinding A/B model', () => {
  test('blinding emerges from the mask: unblinded leaks, blinded collapses', async () => {
    const r = runBlindingSim('blinding-test', 0.6, false)
    const unblinded = finalValue(r.unblindedCorrelation)
    const blinded = finalValue(r.blindedCorrelation)

    // Unblinded path leaks strongly; blinded path is decorrelated near zero.
    expect(unblinded).toBeGreaterThan(0.5)
    expect(blinded).toBeLessThan(0.1)
    // The gap is emergent, not a fixed ratio — blinded should be a small fraction.
    expect(blinded).toBeLessThan(unblinded * 0.3)
  })

  test('the blinded integrity check catches an injected fault', async () => {
    const clean = runBlindingSim('fault-test', 0.6, false)
    expect(clean.blindedState).toBe('OK')
    expect(clean.unblindedState).toBe('OK')

    const faulted = runBlindingSim('fault-test', 0.6, true)
    expect(faulted.unblindedState).toBe('TAMPERED')
    expect(faulted.blindedState).toBe('ABORT')
  })

  test('runs are deterministic for a fixed seed', async () => {
    const a = runBlindingSim('deterministic', 0.6, false)
    const b = runBlindingSim('deterministic', 0.6, false)
    expect(a.unblindedCorrelation).toEqual(b.unblindedCorrelation)
    expect(a.blindedCorrelation).toEqual(b.blindedCorrelation)
  })
})
