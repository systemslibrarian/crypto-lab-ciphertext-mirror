const Q = 3329
const BARRETT_V = 20159
const QINV = 62209

export function freezePoly(poly: number[]): Int16Array {
  const out = new Int16Array(256)
  for (let i = 0; i < 256; i += 1) {
    out[i] = centerReduce(poly[i] ?? 0)
  }
  return out
}

export function centerReduce(v: number): number {
  const mod = modQ(v)
  return mod > Q / 2 ? mod - Q : mod
}

export function modQ(v: number): number {
  const reduced = v % Q
  return reduced < 0 ? reduced + Q : reduced
}

export function barrettReduce(a: number): number {
  const t = ((BARRETT_V * a + (1 << 25)) >> 26) * Q
  return modQ(a - t)
}

export function montgomeryReduce(a: number): number {
  const u = (a * QINV) & 0xffff
  const t = (a + u * Q) >> 16
  return modQ(t)
}

export function polyAdd(a: Int16Array, b: Int16Array): Int16Array {
  const out = new Int16Array(256)
  for (let i = 0; i < 256; i += 1) {
    out[i] = centerReduce((a[i] ?? 0) + (b[i] ?? 0))
  }
  return out
}

export function polySub(a: Int16Array, b: Int16Array): Int16Array {
  const out = new Int16Array(256)
  for (let i = 0; i < 256; i += 1) {
    out[i] = centerReduce((a[i] ?? 0) - (b[i] ?? 0))
  }
  return out
}

export function polyScalarMul(a: Int16Array, scalar: number): Int16Array {
  const out = new Int16Array(256)
  for (let i = 0; i < 256; i += 1) {
    out[i] = centerReduce((a[i] ?? 0) * scalar)
  }
  return out
}

export function polyMulSchoolbook(a: Int16Array, b: Int16Array): Int16Array {
  const acc = new Int32Array(256)
  for (let i = 0; i < 256; i += 1) {
    for (let j = 0; j < 256; j += 1) {
      const term = (a[i] ?? 0) * (b[j] ?? 0)
      const idx = i + j
      if (idx < 256) {
        acc[idx] = (acc[idx] ?? 0) + term
      } else {
        acc[idx - 256] = (acc[idx - 256] ?? 0) - term
      }
    }
  }

  const out = new Int16Array(256)
  for (let i = 0; i < 256; i += 1) {
    out[i] = centerReduce(acc[i] ?? 0)
  }
  return out
}

export const Q_MODULUS = Q
