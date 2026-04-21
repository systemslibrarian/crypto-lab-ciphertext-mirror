// Minimal deterministic fallback expander used when SHA-3 algorithms are unavailable in SubtleCrypto.
export async function keccakExpand(seed: Uint8Array, outLen: number): Promise<Uint8Array> {
  const out = new Uint8Array(outLen)
  let counter = 0
  let offset = 0

  while (offset < outLen) {
    const blockInput = new Uint8Array(seed.length + 4)
    blockInput.set(seed, 0)
    blockInput[seed.length] = counter & 0xff
    blockInput[seed.length + 1] = (counter >> 8) & 0xff
    blockInput[seed.length + 2] = (counter >> 16) & 0xff
    blockInput[seed.length + 3] = (counter >> 24) & 0xff
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', blockInput))
    const take = Math.min(digest.length, outLen - offset)
    out.set(digest.slice(0, take), offset)
    offset += take
    counter += 1
  }

  return out
}
