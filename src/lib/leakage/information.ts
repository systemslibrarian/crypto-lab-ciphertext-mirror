function probability(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError('Expected a probability between 0 and 1')
  }
}

export function binaryEntropy(p: number): number {
  probability(p)
  return p === 0 || p === 1 ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p)
}

/** X ~ Bernoulli(bias), Y = X xor E, E independent of X. Bits per answer. */
export function channelInformation(accuracy: number, bias: number): number {
  probability(accuracy)
  probability(bias)
  const outputOne = 1 - accuracy + bias * (2 * accuracy - 1)
  return Math.max(0, binaryEntropy(outputOne) - binaryEntropy(accuracy))
}

/** Repeating ONE bit: independent flips versus one shared flip for the whole block. */
export function majorityErrors(accuracy: number, repeats: number) {
  probability(accuracy)
  if (!Number.isInteger(repeats) || repeats < 1 || repeats > 15 || repeats % 2 !== 1) {
    throw new RangeError('Use an odd repetition count from 1 to 15')
  }
  const p = 1 - accuracy
  let iid = 0
  let choose = 1
  for (let errors = 0; errors <= repeats; errors++) {
    if (errors > repeats / 2) iid += choose * p ** errors * accuracy ** (repeats - errors)
    choose = (choose * (repeats - errors)) / (errors + 1)
  }
  return { iid, sharedBurst: p }
}
