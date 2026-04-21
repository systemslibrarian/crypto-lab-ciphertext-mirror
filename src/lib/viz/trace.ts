export function normalizeSeries(values: number[]): number[] {
  if (values.length === 0) {
    return []
  }
  const max = Math.max(...values.map((v) => Math.abs(v)), 1e-9)
  return values.map((v) => v / max)
}

export function movingAverage(values: number[], window: number): number[] {
  if (window <= 1) {
    return values.slice()
  }
  const out = new Array<number>(values.length).fill(0)
  let acc = 0
  for (let i = 0; i < values.length; i += 1) {
    acc += values[i] ?? 0
    if (i >= window) {
      acc -= values[i - window] ?? 0
    }
    const denom = i + 1 < window ? i + 1 : window
    out[i] = acc / denom
  }
  return out
}
