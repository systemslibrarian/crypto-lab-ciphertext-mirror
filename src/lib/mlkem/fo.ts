export function foCompare(ct: Uint8Array, ctPrime: Uint8Array): boolean {
  if (ct.length !== ctPrime.length) {
    return false
  }

  let diff = 0
  for (let i = 0; i < ct.length; i += 1) {
    diff |= (ct[i] ?? 0) ^ (ctPrime[i] ?? 0)
  }
  return diff === 0
}
