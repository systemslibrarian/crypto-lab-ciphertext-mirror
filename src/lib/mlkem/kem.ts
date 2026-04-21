import { foCompare } from './fo'
import { hash256, indCpaDecrypt, indCpaEncrypt, indCpaKeyGen, indCpaReencryptFromSecret } from './indcpa'
import { paramsFor, type MlKemLevel, type MlKemParams } from './params'
import { seedToBigInt, Xoshiro256 } from '../prng/xoshiro256'

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

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((acc, p) => acc + p.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

async function kdf(input: Uint8Array): Promise<Uint8Array> {
  return hash256(input)
}

export async function mlKemKeyGen(level: MlKemLevel, seedText: string): Promise<MlKemKeyPair> {
  const params = paramsFor(level)
  const prng = new Xoshiro256(seedToBigInt(seedText))
  const seed = prng.nextBytes(32)
  const pair = await indCpaKeyGen(seed)
  const z = prng.nextBytes(32)
  return {
    params,
    pk: pair.pk,
    sk: pair.sk,
    z,
  }
}

export async function mlKemEncaps(pk: Uint8Array, seedText: string): Promise<EncapsResult> {
  const prng = new Xoshiro256(seedToBigInt(seedText))
  const message = prng.nextBytes(32)
  const coins = prng.nextBytes(32)
  const ciphertext = await indCpaEncrypt(pk, message, coins)
  const sharedSecret = await kdf(concatBytes(message, ciphertext))
  return { ciphertext, sharedSecret, message }
}

export async function mlKemDecaps(sk: Uint8Array, z: Uint8Array, ciphertext: Uint8Array): Promise<Uint8Array> {
  const messagePrime = await indCpaDecrypt(sk, ciphertext)
  const coins = ciphertext.slice(0, 32)
  const ctPrime = await indCpaReencryptFromSecret(sk, messagePrime, coins)

  if (foCompare(ciphertext, ctPrime)) {
    return kdf(concatBytes(messagePrime, ciphertext))
  }

  return kdf(concatBytes(z, ciphertext))
}
