export type LatticeNode = {
  id: string
  x: number
  y: number
  confidence: number
}

export type LatticeEdge = {
  from: string
  to: string
  weight: number
}

export function makeBipartite(variableCount: number, checkCount: number): { variables: LatticeNode[]; checks: LatticeNode[]; edges: LatticeEdge[] } {
  const variables: LatticeNode[] = []
  const checks: LatticeNode[] = []
  const edges: LatticeEdge[] = []

  for (let i = 0; i < variableCount; i += 1) {
    variables.push({ id: `v${i}`, x: 90 + (i % 16) * 34, y: 24 + Math.floor(i / 16) * 34, confidence: 0 })
  }

  for (let j = 0; j < checkCount; j += 1) {
    checks.push({ id: `c${j}`, x: 90 + (j % 16) * 34, y: 168 + Math.floor(j / 16) * 30, confidence: 0 })
  }

  for (let j = 0; j < checkCount; j += 1) {
    const degree = 3 + (j % 2)
    for (let d = 0; d < degree; d += 1) {
      const v = (j * 5 + d * 7) % variableCount
      edges.push({ from: `v${v}`, to: `c${j}`, weight: d % 2 === 0 ? 1 : -1 })
    }
  }

  return { variables, checks, edges }
}
