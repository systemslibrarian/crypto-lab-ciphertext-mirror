import { renderInterpretationBlock } from '../../components/InterpretationBlock'
import { renderPaperMapping } from '../../components/PaperMapping'
import { renderParamSelector } from '../../components/ParamSelector'
import { renderProgressBar } from '../../components/ProgressBar'
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

  const runStatus = document.createElement('p')
  runStatus.className = 'run-status'
  runStatus.textContent = 'Ready to run.'

  const progressMount = document.createElement('div')
  progressMount.className = 'output-block'
  progressMount.append(renderProgressBar(0, 3))

  const chartMount = document.createElement('div')
  chartMount.className = 'output-block'
  const chartTitle = document.createElement('h3')
  chartTitle.className = 'card-section-title'
  chartTitle.textContent = 'Simulation Output: Recovered Components Over Queries'
  chartMount.append(chartTitle)

  const nodeMount = document.createElement('div')
  nodeMount.className = 'output-block'
  nodeMount.style.display = 'grid'
  nodeMount.style.gap = '0.4rem'

  const nodeTitle = document.createElement('h3')
  nodeTitle.className = 'card-section-title'
  nodeTitle.textContent = 'Simulation Output: Node Confidence Snapshot'
  nodeMount.append(nodeTitle)

  const chartInterpretation = renderInterpretationBlock({
    whatSeeing:
      'The curve tracks how many secret components are recovered as oracle queries accumulate under selected error and availability settings.',
    parameterChange:
      'Increasing oracle error rate or decreasing availability generally slows convergence and flattens the recovery curve.',
    whyMatters:
      'It demonstrates the core paper intuition that imperfect feedback can still leak actionable information in aggregate.',
    notProve:
      'It does not establish end-to-end key recovery cost on a specific implementation or a practical attack timeline.',
  })

  const nodeInterpretation = renderInterpretationBlock({
    whatSeeing:
      'Each cell is a variable confidence proxy after the replay, with brighter cells indicating higher inferred confidence.',
    parameterChange:
      'Cleaner oracle responses increase confidence uniformity; noisier conditions produce patchy, lower-confidence regions.',
    whyMatters:
      'The strip helps visualize whether uncertainty is globally reduced or concentrated in a few components.',
    notProve:
      'These confidence values are synthetic and not calibrated to a concrete decoder implementation in the paper.',
  })

  const mapping = renderPaperMapping({
    paperClaim:
      'Hybrid adaptive/LDPC-style strategies can leverage imperfect decryption-failure oracles against ML-KEM-style targets.',
    demoModels:
      'Seeded imperfect oracle responses with explicit error-rate and availability parameters, plus convergence telemetry.',
    demoOmits:
      'Exact parity-check construction, full decoding internals, and implementation-level timing effects.',
  })

  run.addEventListener('click', async () => {
    run.disabled = true
    seedInput.disabled = true
    pErrInput.disabled = true
    alphaInput.disabled = true
    chartMount.classList.add('is-running')
    nodeMount.classList.add('is-running')
    run.textContent = 'Running replay...'

    const stages = ['Sampling traces...', 'Estimating confidence...', 'Preparing replay results...']
    for (let index = 0; index < stages.length; index += 1) {
      runStatus.textContent = stages[index] ?? 'Running...'
      progressMount.innerHTML = ''
      progressMount.append(renderProgressBar(index + 1, stages.length))
      await new Promise<void>((resolve) => {
        window.setTimeout(() => resolve(), 120)
      })
    }

    const budget = level === 1024 ? 240 : 180
    const result = runDfOracleSim(`${seed}:${level}`, pErr, alpha, budget)
    chartMount.innerHTML = ''
    nodeMount.innerHTML = ''
    chartMount.append(chartTitle, renderTraceViewer(result.recoveredOverQueries, 'var(--mirror-cloud)'))
    nodeMount.append(nodeTitle, renderNodeStrip(result.variables.map((v) => v.confidence)))

    chartMount.classList.remove('is-running')
    nodeMount.classList.remove('is-running')
    runStatus.textContent = 'Replay complete.'
    seedInput.disabled = false
    pErrInput.disabled = false
    alphaInput.disabled = false
    run.disabled = false
    run.textContent = 'Run oracle replay'
  })

  setup.append(seedInput, pErrInput, alphaInput, run)

  card.append(
    head,
    setup,
    runStatus,
    progressMount,
    renderMirror('clouded'),
    chartMount,
    chartInterpretation,
    nodeMount,
    nodeInterpretation,
    mapping,
    renderRealityPanel(imperfectDfReality),
  )
  return card
}
