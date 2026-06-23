import { describe, expect, test } from 'vitest'
import { runDfOracleSim } from '../sim'

function finalRecovered(curve: number[]): number {
  return curve[curve.length - 1] ?? 0
}

describe('imperfect DF-oracle model', () => {
  test('a clean oracle fully recovers the key', () => {
    const clean = runDfOracleSim('df:clean', 0.05, 0.9, 400)
    expect(finalRecovered(clean.recoveredOverQueries)).toBeGreaterThan(0.95)
  })

  test('a cleaner oracle recovers more than a noisy one (same secret)', () => {
    const clean = runDfOracleSim('df:same', 0.05, 0.9, 400)
    const noisy = runDfOracleSim('df:same', 0.45, 0.9, 400)
    expect(finalRecovered(clean.recoveredOverQueries)).toBeGreaterThan(
      finalRecovered(noisy.recoveredOverQueries) + 0.15,
    )
  })

  test('a near-coin-flip oracle (pErr→0.5) stalls near random guessing', () => {
    const coinFlip = runDfOracleSim('df:coin', 0.49, 1.0, 400)
    expect(finalRecovered(coinFlip.recoveredOverQueries)).toBeLessThan(0.75)
  })

  test('more available answers recover at least as much', () => {
    const sparse = runDfOracleSim('df:avail', 0.1, 0.1, 400)
    const plentiful = runDfOracleSim('df:avail', 0.1, 0.9, 400)
    expect(finalRecovered(plentiful.recoveredOverQueries)).toBeGreaterThanOrEqual(
      finalRecovered(sparse.recoveredOverQueries),
    )
  })

  test('recovery is non-trivial and monotone-ish (rises from its start)', () => {
    const r = runDfOracleSim('df:trend', 0.1, 0.8, 400)
    const start = r.recoveredOverQueries[0] ?? 0
    expect(finalRecovered(r.recoveredOverQueries)).toBeGreaterThan(start)
  })

  test('runs are deterministic for a fixed seed', () => {
    const a = runDfOracleSim('df:det', 0.2, 0.5, 200)
    const b = runDfOracleSim('df:det', 0.2, 0.5, 200)
    expect(a.recoveredOverQueries).toEqual(b.recoveredOverQueries)
  })
})
