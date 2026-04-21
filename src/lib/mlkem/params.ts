export type MlKemLevel = 512 | 768 | 1024

export type MlKemParams = {
  readonly level: MlKemLevel
  readonly n: 256
  readonly k: 2 | 3 | 4
  readonly q: 3329
  readonly eta1: 2 | 3
  readonly eta2: 2
  readonly du: 10 | 11
  readonly dv: 4 | 5
}

export const ML_KEM_512 = Object.freeze({
  level: 512,
  n: 256,
  k: 2,
  q: 3329,
  eta1: 3,
  eta2: 2,
  du: 10,
  dv: 4,
} satisfies MlKemParams)

export const ML_KEM_768 = Object.freeze({
  level: 768,
  n: 256,
  k: 3,
  q: 3329,
  eta1: 2,
  eta2: 2,
  du: 10,
  dv: 4,
} satisfies MlKemParams)

export const ML_KEM_1024 = Object.freeze({
  level: 1024,
  n: 256,
  k: 4,
  q: 3329,
  eta1: 2,
  eta2: 2,
  du: 11,
  dv: 5,
} satisfies MlKemParams)

export function paramsFor(level: MlKemLevel): MlKemParams {
  if (level === 512) {
    return ML_KEM_512
  }
  if (level === 768) {
    return ML_KEM_768
  }
  return ML_KEM_1024
}
