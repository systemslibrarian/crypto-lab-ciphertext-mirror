import { Xoshiro256 } from '../prng/xoshiro256'

export function booleanMaskByte(value: number, order: number, prng: Xoshiro256): Uint8Array {
  if (order <= 0) {
    return new Uint8Array([value & 0xff])
  }

  const shares = new Uint8Array(order + 1)
  let acc = value & 0xff
  for (let i = 0; i < order; i += 1) {
    const share = prng.nextU32() & 0xff
    shares[i] = share
    acc ^= share
  }
  shares[order] = acc
  return shares
}
