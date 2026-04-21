import { booleanMaskByte } from '../../lib/leakage/masking'
import { pearsonCorrelation, simulateLeakageTrace } from '../../lib/leakage/model'
import { mlKemDecaps, mlKemEncaps, mlKemKeyGen } from '../../lib/mlkem/kem'
import { seedToBigInt, Xoshiro256 } from '../../lib/prng/xoshiro256'
import type { MlKemLevel } from '../../components/types'

export type MaskedRunOutput = {
  curves: Record<0 | 1 | 2 | 3, number[]>
  tracesNeeded95: Record<0 | 1 | 2 | 3, number>
}

function estimateTraceCount(correlationPeak: number): number {
  const r = Math.max(Math.abs(correlationPeak), 1e-4)
  return Math.ceil((1.96 / r) ** 2)
}

export async function runMaskedComparisonSim(level: MlKemLevel, seedText: string, sigma: number, bitIndex: number): Promise<MaskedRunOutput> {
  const keyPair = await mlKemKeyGen(level, seedText)
  const encaps = await mlKemEncaps(keyPair.pk, `${seedText}:encap`)
  await mlKemDecaps(keyPair.sk, keyPair.z, encaps.ciphertext)

  const targetBit = ((encaps.message[Math.floor(bitIndex / 8)] ?? 0) >> (bitIndex % 8)) & 1

  const curves: Record<0 | 1 | 2 | 3, number[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
  }

  const tracesNeeded95: Record<0 | 1 | 2 | 3, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }

  for (const order of [0, 1, 2, 3] as const) {
    const prng = new Xoshiro256(seedToBigInt(`${seedText}:order:${order}`))
    const leakageTotals: number[] = []
    const bitSeries: number[] = []

    for (let t = 0; t < 500; t += 1) {
      const trace = simulateLeakageTrace(encaps.ciphertext, sigma, prng)
      const masked = booleanMaskByte(targetBit, order, prng)
      const shareLeak = Array.from(masked).reduce((acc, v) => acc + (v & 1), 0)
      const sumLeak = trace.reduce((acc, p) => acc + p.value, 0) + shareLeak
      leakageTotals.push(sumLeak)
      bitSeries.push(targetBit)
      curves[order].push(pearsonCorrelation(leakageTotals, bitSeries))
    }

    const peak = Math.max(...curves[order].map((v) => Math.abs(v)), 1e-4)
    tracesNeeded95[order] = estimateTraceCount(peak)
  }

  return { curves, tracesNeeded95 }
}
