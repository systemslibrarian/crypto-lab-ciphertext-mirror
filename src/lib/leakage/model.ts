import { Xoshiro256 } from '../prng/xoshiro256'

export type LeakagePoint = {
  sample: number
  value: number
}

function boxMuller(prng: Xoshiro256): number {
  const u1 = Math.max(prng.nextFloat(), 1e-12)
  const u2 = prng.nextFloat()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

export function hammingWeightByte(v: number): number {
  let x = v & 0xff
  let count = 0
  while (x > 0) {
    count += x & 1
    x >>= 1
  }
  return count
}

export function hammingDistanceByte(a: number, b: number): number {
  return hammingWeightByte((a ^ b) & 0xff)
}

export function simulateLeakageTrace(bytes: Uint8Array, sigma: number, prng: Xoshiro256): LeakagePoint[] {
  const points: LeakagePoint[] = []
  for (let i = 0; i < bytes.length; i += 1) {
    const hw = hammingWeightByte(bytes[i] ?? 0)
    const noise = boxMuller(prng) * sigma
    points.push({ sample: i, value: hw + noise })
  }
  return points
}

export function pearsonCorrelation(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length === 0) {
    return 0
  }

  const n = xs.length
  let sumX = 0
  let sumY = 0
  let sumXX = 0
  let sumYY = 0
  let sumXY = 0

  for (let i = 0; i < n; i += 1) {
    const x = xs[i] ?? 0
    const y = ys[i] ?? 0
    sumX += x
    sumY += y
    sumXX += x * x
    sumYY += y * y
    sumXY += x * y
  }

  const num = n * sumXY - sumX * sumY
  const den = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))
  return den === 0 ? 0 : num / den
}
