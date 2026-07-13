import { describe, expect, test } from 'vitest'
import { MAX_TRACE_ESTIMATE, runMaskedComparisonSim, sampleMaskingMechanism } from '../sim'

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

  test('the run reports the real recovered key bit it resolved', async () => {
    const r = await runMaskedComparisonSim(512, 'keybit', 0.6, 5)
    expect(r.targetIndex).toBe(5)
    expect([0, 1]).toContain(r.targetBit)
  })
})

describe('masking mechanism strip is a faithful decomposition of the same model', () => {
  test('XOR of the share bits equals the decision bit, and the distinguisher is their leak product', async () => {
    const sample = await sampleMaskingMechanism(512, 'mech', 0.7, 0, 2, 6)
    expect(sample.order).toBe(2)
    expect(sample.traces).toHaveLength(6)
    for (const trace of sample.traces) {
      // d+1 shares whose bits XOR to the decision bit (Boolean masking invariant).
      expect(trace.shares).toHaveLength(3)
      const xor = trace.shares.reduce((acc, s) => acc ^ s.bit, 0)
      expect(xor).toBe(trace.decisionBit)
      // Each leak is exactly centered HW + noise; distinguisher is their product.
      let product = 1
      for (const s of trace.shares) {
        expect(s.leak).toBeCloseTo(s.centered + s.noise, 10)
        product *= s.leak
      }
      expect(trace.distinguisher).toBeCloseTo(product, 8)
    }
  })

  test('the walkthrough resolves a real ML-KEM shared-secret bit', async () => {
    const sample = await sampleMaskingMechanism(512, 'mech', 0.7, 9, 1, 4)
    expect(sample.targetIndex).toBe(9)
    expect([0, 1]).toContain(sample.targetBit)
    expect(sample.runningCorrelation).toHaveLength(4)
  })
})
