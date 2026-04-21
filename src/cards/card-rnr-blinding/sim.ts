import { applyRnrMask, detectSingleBitFault, removeRnrMask } from '../../lib/leakage/blinding'
import { simulateLeakageTrace } from '../../lib/leakage/model'
import { seedToBigInt, Xoshiro256 } from '../../lib/prng/xoshiro256'

export type BlindingResult = {
  unblindedCorrelation: number[]
  blindedCorrelation: number[]
  unblindedState: 'OK' | 'TAMPERED'
  blindedState: 'OK' | 'ABORT'
}

export function runBlindingSim(seedText: string, sigma: number, injectFault: boolean): BlindingResult {
  const prng = new Xoshiro256(seedToBigInt(seedText))
  const base = prng.nextBytes(128)
  const coeffs = new Int16Array(base.length)
  for (let i = 0; i < coeffs.length; i += 1) {
    coeffs[i] = (base[i] ?? 0) - 128
  }

  const { masked, mask } = applyRnrMask(coeffs, prng)
  const unblindedTrace = simulateLeakageTrace(base, sigma, prng).map((p) => p.value)

  const maskedBytes = new Uint8Array(masked.length)
  for (let i = 0; i < masked.length; i += 1) {
    maskedBytes[i] = (masked[i] ?? 0) & 0xff
  }
  const blindedTrace = simulateLeakageTrace(maskedBytes, sigma, prng).map((p) => p.value * 0.25)

  const recovered = removeRnrMask(masked, mask)
  const recoveredBytes = new Uint8Array(recovered.length)
  for (let i = 0; i < recovered.length; i += 1) {
    recoveredBytes[i] = (recovered[i] ?? 0) & 0xff
  }

  const tampered = recoveredBytes.slice()
  if (injectFault && tampered.length > 0) {
    tampered[0] = (tampered[0] ?? 0) ^ 0x01
  }

  const faultDetected = detectSingleBitFault(recoveredBytes, tampered)

  return {
    unblindedCorrelation: unblindedTrace,
    blindedCorrelation: blindedTrace,
    unblindedState: injectFault ? 'TAMPERED' : 'OK',
    blindedState: faultDetected ? 'ABORT' : 'OK',
  }
}
