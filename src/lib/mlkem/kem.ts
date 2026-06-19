import { levelFromKeyLength, mlkemDecapsInternal, mlkemEncapsInternal, mlkemKeyGenInternal } from './fips203'
import { paramsFor, type MlKemLevel, type MlKemParams } from './params'
import { shake256 } from './sha3'

type MlKemKeyPair = {
  params: MlKemParams
  pk: Uint8Array
  sk: Uint8Array
  z: Uint8Array
}

type EncapsResult = {
  ciphertext: Uint8Array
  sharedSecret: Uint8Array
  message: Uint8Array
}

const encoder = new TextEncoder()

/**
 * Derive a deterministic 32-byte value from a human-readable seed string. This makes the
 * demo's runs reproducible while feeding the genuine FIPS 203 deterministic entry points
 * (which expect explicit randomness d, z, m) rather than a system RBG.
 */
function expand(seedText: string, label: string): Uint8Array {
  return shake256(encoder.encode(`${seedText}|${label}`), 32)
}

export async function mlKemKeyGen(level: MlKemLevel, seedText: string): Promise<MlKemKeyPair> {
  const params = paramsFor(level)
  const d = expand(seedText, 'keygen-d')
  const z = expand(seedText, 'keygen-z')
  const { ek, dk } = mlkemKeyGenInternal(level, d, z)
  return { params, pk: ek, sk: dk, z }
}

export async function mlKemEncaps(pk: Uint8Array, seedText: string): Promise<EncapsResult> {
  const level = levelFromKeyLength(pk.length)
  const message = expand(seedText, 'encaps-m')
  const { ciphertext, sharedSecret } = mlkemEncapsInternal(level, pk, message)
  return { ciphertext, sharedSecret, message }
}

export async function mlKemDecaps(sk: Uint8Array, _z: Uint8Array, ciphertext: Uint8Array): Promise<Uint8Array> {
  // The implicit-rejection seed z is embedded in the FIPS 203 decapsulation key, so the
  // separate z argument is retained only for backward compatibility with existing callers.
  const level = levelFromKeyLength(sk.length)
  return mlkemDecapsInternal(level, sk, ciphertext)
}
