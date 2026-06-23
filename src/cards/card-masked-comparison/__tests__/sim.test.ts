import { describe, expect, test } from 'vitest'
import { MAX_TRACE_ESTIMATE, runMaskedComparisonSim } from '../sim'

const ORDERS = [0, 1, 2, 3] as const

describe('masked comparison higher-order CPA model', () => {
  test('attacker cost rises with masking order (the core lesson)', async () => {
    const { tracesNeeded95 } = await runMaskedComparisonSim(512, 'test-order', 0.6, 0)

    // Strictly increasing in order: each extra share multiplies the trace cost.
    for (const order of [1, 2, 3] as const) {
      expect(tracesNeeded95[order]).toBeGreaterThan(tracesNeeded95[(order - 1) as 0 | 1 | 2])
    }

    // Regression guard against the previous dead model, where every order pinned
    // at the same floor value because correlation was computed against a constant.
    const allEqual = ORDERS.every((o) => tracesNeeded95[o] === tracesNeeded95[0])
    expect(allEqual).toBe(false)
  })

  test('more noise costs the attacker more traces at every order', async () => {
    const quiet = await runMaskedComparisonSim(512, 'test-noise', 0.4, 0)
    const loud = await runMaskedComparisonSim(512, 'test-noise', 1.0, 0)

    for (const order of ORDERS) {
      expect(loud.tracesNeeded95[order]).toBeGreaterThan(quiet.tracesNeeded95[order])
    }
  })

  test('the order-vs-noise gap widens as noise rises', async () => {
    const quiet = await runMaskedComparisonSim(512, 'test-gap', 0.4, 0)
    const loud = await runMaskedComparisonSim(512, 'test-gap', 1.2, 0)

    const quietGap = quiet.tracesNeeded95[3] / quiet.tracesNeeded95[0]
    const loudGap = loud.tracesNeeded95[3] / loud.tracesNeeded95[0]
    expect(loudGap).toBeGreaterThan(quietGap)
  })

  test('estimates stay within the replay reporting ceiling', async () => {
    const { tracesNeeded95 } = await runMaskedComparisonSim(512, 'test-cap', 2.0, 0)
    for (const order of ORDERS) {
      expect(tracesNeeded95[order]).toBeLessThanOrEqual(MAX_TRACE_ESTIMATE)
      expect(tracesNeeded95[order]).toBeGreaterThan(0)
    }
  })

  test('runs are deterministic for a fixed seed', async () => {
    const a = await runMaskedComparisonSim(768, 'deterministic', 0.6, 3)
    const b = await runMaskedComparisonSim(768, 'deterministic', 0.6, 3)
    expect(a.tracesNeeded95).toEqual(b.tracesNeeded95)
  })
})
