import { Xoshiro256 } from '../prng/xoshiro256'

export type OracleAnswer = {
  available: boolean
  bit: 0 | 1
}

export function imperfectOracle(baseBit: 0 | 1, pErr: number, alpha: number, prng: Xoshiro256): OracleAnswer {
  if (prng.nextFloat() > alpha) {
    return { available: false, bit: 0 }
  }
  const flip = prng.nextFloat() < pErr
  return { available: true, bit: flip ? ((1 - baseBit) as 0 | 1) : baseBit }
}
