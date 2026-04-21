import { shakeExpand } from './sample'

type IndCpaKeyPair = {
  pk: Uint8Array
  sk: Uint8Array
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

export async function hash256(input: Uint8Array): Promise<Uint8Array> {
  const bytes = Uint8Array.from(input)
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.buffer))
}

async function stream(key: Uint8Array, coins: Uint8Array, len: number): Promise<Uint8Array> {
  return shakeExpand(concatBytes(key, coins), len)
}

export async function indCpaKeyGen(seed: Uint8Array): Promise<IndCpaKeyPair> {
  const sk = await hash256(seed)
  const pk = await hash256(concatBytes(sk, sk))
  return { pk, sk }
}

export async function indCpaEncrypt(pk: Uint8Array, message: Uint8Array, coins: Uint8Array): Promise<Uint8Array> {
  const mask = await stream(pk, coins, message.length)
  const body = new Uint8Array(message.length)
  for (let i = 0; i < message.length; i += 1) {
    body[i] = (message[i] ?? 0) ^ (mask[i] ?? 0)
  }
  const tag = await hash256(concatBytes(message, pk, coins))
  return concatBytes(coins, body, tag)
}

export async function indCpaDecrypt(sk: Uint8Array, ciphertext: Uint8Array): Promise<Uint8Array> {
  if (ciphertext.length < 96) {
    return new Uint8Array(32)
  }
  const coins = ciphertext.slice(0, 32)
  const body = ciphertext.slice(32, 64)
  const pk = await hash256(concatBytes(sk, sk))
  const mask = await stream(pk, coins, body.length)
  const message = new Uint8Array(body.length)
  for (let i = 0; i < body.length; i += 1) {
    message[i] = (body[i] ?? 0) ^ (mask[i] ?? 0)
  }
  return message
}

export async function indCpaReencryptFromSecret(sk: Uint8Array, message: Uint8Array, coins: Uint8Array): Promise<Uint8Array> {
  const pk = await hash256(concatBytes(sk, sk))
  return indCpaEncrypt(pk, message, coins)
}
