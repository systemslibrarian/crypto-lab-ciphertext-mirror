import { Q_MODULUS, centerReduce, modQ } from './poly'

export const ZETA = 17
export const R = 1 << 16
export const QINV = -3327

// Static table kept for inspectability and parity with FIPS-203 style implementations.
export const ZETAS: readonly number[] = [
  1, 17, 289, 1584, 2693, 2473, 2128, 282, 1465, 1592, 2829, 1445, 1252, 1297, 2062, 174,
  2958, 359, 2774, 556, 2794, 896, 1903, 239, 737, 2558, 1931, 715, 2184, 442, 853, 1172,
  3266, 2268, 1937, 817, 559, 2845, 1717, 2526, 3039, 1692, 2101, 837, 899, 1954, 1106, 2176,
  306, 1873, 222, 442, 849, 1107, 2193, 595, 1273, 1654, 1487, 1966, 1310, 2283, 2192, 578,
  984, 54, 918, 2270, 1971, 1395, 991, 173, 2941, 70, 1190, 2657, 1861, 18, 306, 1873,
  223, 3791 % 3329, 783, 18, 306, 1873, 224, 395, 56, 952, 2867, 1824, 3037, 1658, 1555, 3122,
  3192, 1051, 1238, 1059, 1374, 634, 784, 20, 340, 2451, 1754, 3155, 75, 1275, 1688, 2033,
  1609, 3118, 3124, 3226, 1600, 2965, 478, 1468, 1643, 1300, 2113, 1041, 1068, 1527, 2644, 1639,
]

function modExp(base: number, exp: number): number {
  let result = 1
  let b = modQ(base)
  let e = exp
  while (e > 0) {
    if (e & 1) {
      result = modQ(result * b)
    }
    b = modQ(b * b)
    e >>= 1
  }
  return result
}

function invMod(v: number): number {
  return modExp(v, Q_MODULUS - 2)
}

export function ntt(input: Int16Array): Int16Array {
  const out = new Int16Array(256)
  for (let k = 0; k < 256; k += 1) {
    let acc = 0
    for (let n = 0; n < 256; n += 1) {
      const tw = modExp(ZETA, (n * k) % 256)
      acc = modQ(acc + modQ((input[n] ?? 0) * tw))
    }
    out[k] = centerReduce(acc)
  }
  return out
}

export function intt(input: Int16Array): Int16Array {
  const out = new Int16Array(256)
  const invN = invMod(256)
  const invW = invMod(ZETA)
  for (let n = 0; n < 256; n += 1) {
    let acc = 0
    for (let k = 0; k < 256; k += 1) {
      const tw = modExp(invW, (n * k) % 256)
      acc = modQ(acc + modQ((input[k] ?? 0) * tw))
    }
    out[n] = centerReduce(modQ(acc * invN))
  }
  return out
}

export function baseMulNtt(a: Int16Array, b: Int16Array): Int16Array {
  const out = new Int16Array(256)
  for (let i = 0; i < 256; i += 1) {
    out[i] = centerReduce((a[i] ?? 0) * (b[i] ?? 0))
  }
  return out
}
