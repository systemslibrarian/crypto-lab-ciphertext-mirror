import { Q_MODULUS, modQ } from './poly'

export function compressD(x: number, d: number): number {
  const scale = 1 << d
  const normalized = modQ(x)
  const value = Math.round((normalized * scale) / Q_MODULUS)
  return value & (scale - 1)
}

export function decompressD(v: number, d: number): number {
  const scale = 1 << d
  return modQ(Math.round((v * Q_MODULUS) / scale))
}

export function compressPoly(poly: Int16Array, d: number): Uint16Array {
  const out = new Uint16Array(poly.length)
  for (let i = 0; i < poly.length; i += 1) {
    out[i] = compressD(poly[i] ?? 0, d)
  }
  return out
}

export function decompressPoly(poly: Uint16Array, d: number): Int16Array {
  const out = new Int16Array(poly.length)
  for (let i = 0; i < poly.length; i += 1) {
    out[i] = decompressD(poly[i] ?? 0, d)
  }
  return out
}
