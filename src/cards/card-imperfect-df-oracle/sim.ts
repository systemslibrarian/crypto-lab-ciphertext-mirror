import { imperfectOracle } from '../../lib/leakage/df-oracle'
import { makeBipartite } from '../../lib/viz/lattice'
import { seedToBigInt, Xoshiro256 } from '../../lib/prng/xoshiro256'

export type DfRunResult = {
  recoveredOverQueries: number[]
  variables: { id: string; confidence: number }[]
}

export function runDfOracleSim(seedText: string, pErr: number, alpha: number, queryBudget: number): DfRunResult {
  const prng = new Xoshiro256(seedToBigInt(seedText))
  const graph = makeBipartite(64, 64)
  const secret = new Int8Array(64)
  for (let i = 0; i < secret.length; i += 1) {
    secret[i] = prng.nextFloat() > 0.5 ? 1 : -1
  }

  const llr = new Float64Array(64)
  const recoveredOverQueries: number[] = []

  for (let q = 0; q < queryBudget; q += 1) {
    const checkIdx = q % graph.checks.length
    const check = graph.checks[checkIdx]
    if (!check) {
      continue
    }

    const edges = graph.edges.filter((e) => e.to === check.id)
    let parity = 0
    edges.forEach((edge) => {
      const id = Number(edge.from.slice(1))
      parity ^= secret[id] === 1 ? 1 : 0
    })

    const response = imperfectOracle(parity as 0 | 1, pErr, alpha, prng)
    if (response.available) {
      const sign = response.bit === 1 ? 1 : -1
      edges.forEach((edge) => {
        const id = Number(edge.from.slice(1))
        llr[id] = (llr[id] ?? 0) + sign * edge.weight * (1 - pErr)
      })
    }

    let recovered = 0
    for (let i = 0; i < llr.length; i += 1) {
      const guess = (llr[i] ?? 0) >= 0 ? 1 : -1
      if (guess === secret[i]) {
        recovered += 1
      }
    }
    recoveredOverQueries.push(recovered / llr.length)
  }

  const variables = Array.from(llr).map((value, index) => ({
    id: `v${index}`,
    confidence: Math.max(0, Math.min(1, Math.abs(value) / 6)),
  }))

  return { recoveredOverQueries, variables }
}
