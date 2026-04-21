import { renderParamSelector } from '../../components/ParamSelector'
import { renderRealityPanel } from '../../components/RealityPanel'
import { renderScholarBadge } from '../../components/ScholarBadge'
import { renderTraceViewer } from '../../components/TraceViewer'
import type { MlKemLevel } from '../../components/types'
import { renderMirror } from '../../lib/viz/mirror'
import { imperfectDfReality } from './reality'
import { runDfOracleSim } from './sim'

function renderNodeStrip(confidence: number[]): HTMLElement {
  const row = document.createElement('div')
  row.style.display = 'grid'
  row.style.gridTemplateColumns = 'repeat(16, minmax(0, 1fr))'
  row.style.gap = '0.25rem'
  confidence.forEach((value) => {
    const cell = document.createElement('div')
    cell.style.height = '0.8rem'
    cell.style.borderRadius = '0.2rem'
    cell.style.background = `color-mix(in oklab, var(--success) ${Math.round(value * 100)}%, var(--surface-alt))`
    row.append(cell)
  })
  return row
}

export function renderImperfectDfOracleCardView(): HTMLElement {
  const card = document.createElement('section')
  card.className = 'card-shell'

  const head = document.createElement('div')
  head.className = 'card-head'
  const titleBlock = document.createElement('div')
  titleBlock.innerHTML = '<h2>2026/070 - Imperfect DF-Oracle</h2><p>Noisy and partial oracles still converge under adaptive LDPC-like decoding.</p>'
  head.append(
    titleBlock,
    renderScholarBadge({
      title: 'Unlocking the True Potential of Decryption Failure Oracles: A Hybrid Adaptive-LDPC Attack on ML-KEM Using Imperfect Oracles',
      year: 2026,
      eprintId: '070',
      authorLine: 'Guo, Nabokov, Johansson',
      url: 'https://eprint.iacr.org/2026/070',
    }),
  )

  const setup = document.createElement('div')
  setup.className = 'card-setup'
  let level: MlKemLevel = 768
  let seed = 'mirror-card-2'
  let pErr = 0.2
  let alpha = 0.5

  setup.append(renderParamSelector(level, (next) => { level = next }))

  const seedInput = document.createElement('input')
  seedInput.value = seed
  seedInput.setAttribute('aria-label', 'Simulation seed')
  seedInput.addEventListener('input', () => {
    seed = seedInput.value
  })

  const pErrInput = document.createElement('input')
  pErrInput.type = 'range'
  pErrInput.min = '0'
  pErrInput.max = '0.49'
  pErrInput.step = '0.01'
  pErrInput.value = String(pErr)
  pErrInput.setAttribute('aria-label', 'Oracle error rate')
  pErrInput.addEventListener('input', () => {
    pErr = Number(pErrInput.value)
  })

  const alphaInput = document.createElement('input')
  alphaInput.type = 'range'
  alphaInput.min = '0.05'
  alphaInput.max = '1'
  alphaInput.step = '0.01'
  alphaInput.value = String(alpha)
  alphaInput.setAttribute('aria-label', 'Oracle availability')
  alphaInput.addEventListener('input', () => {
    alpha = Number(alphaInput.value)
  })

  const run = document.createElement('button')
  run.type = 'button'
  run.className = 'open-btn'
  run.textContent = 'Run oracle replay'

  const chartMount = document.createElement('div')
  const nodeMount = document.createElement('div')
  nodeMount.style.display = 'grid'
  nodeMount.style.gap = '0.4rem'

  run.addEventListener('click', () => {
    run.disabled = true
    run.textContent = 'Running...'
    const budget = level === 1024 ? 240 : 180
    const result = runDfOracleSim(`${seed}:${level}`, pErr, alpha, budget)
    chartMount.innerHTML = ''
    nodeMount.innerHTML = ''
    chartMount.append(renderTraceViewer(result.recoveredOverQueries, 'var(--mirror-cloud)'))
    nodeMount.append(renderNodeStrip(result.variables.map((v) => v.confidence)))
    run.disabled = false
    run.textContent = 'Run oracle replay'
  })

  setup.append(seedInput, pErrInput, alphaInput, run)

  card.append(head, setup, renderMirror('clouded'), chartMount, nodeMount, renderRealityPanel(imperfectDfReality))
  return card
}
