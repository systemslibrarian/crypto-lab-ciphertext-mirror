import { renderInterpretationBlock } from '../../components/InterpretationBlock'
import { renderPaperMapping } from '../../components/PaperMapping'
import { renderParamSelector } from '../../components/ParamSelector'
import { renderProgressBar } from '../../components/ProgressBar'
import { renderRealityPanel } from '../../components/RealityPanel'
import { renderScholarBadge } from '../../components/ScholarBadge'
import { renderTraceViewer } from '../../components/TraceViewer'
import { renderVerdictBanner, type VerdictTone } from '../../components/VerdictBanner'
import type { MlKemLevel } from '../../components/types'
import { imperfectDfReality } from './reality'
import { runDfOracleSim } from './sim'

type Verdict = { tone: VerdictTone; headline: string; detail: string; nextStep: string }

function verdictForDf(recovered: number, avgConfidence: number, pErr: number, alpha: number): Verdict {
  const recPct = (recovered * 100).toFixed(1)
  const confPct = (avgConfidence * 100).toFixed(1)
  if (recovered >= 0.9) {
    return {
      tone: 'bad',
      headline: `Oracle leaked the secret — ${recPct}% recovered`,
      detail: `Even with error rate ${pErr.toFixed(2)} and availability ${alpha.toFixed(2)}, the adaptive replay drove recovery past 90% with average confidence ${confPct}%.`,
      nextStep: 'Push pErr above 0.35 or drop availability below 0.20 to find the point where recovery stalls.',
    }
  }
  if (recovered >= 0.6) {
    return {
      tone: 'warn',
      headline: `Partial recovery — ${recPct}% of components inferred`,
      detail: `Recovery is incomplete (avg confidence ${confPct}%) but not flat. The hybrid LDPC step is still extracting structure even with imperfect feedback.`,
      nextStep: 'Lower error rate to model a cleaner channel, or raise availability to confirm the trend goes monotonic.',
    }
  }
  return {
    tone: 'good',
    headline: `Replay stalled — only ${recPct}% recovered`,
    detail: `Avg confidence ${confPct}% means the noisy oracle (pErr=${pErr.toFixed(2)}, availability=${alpha.toFixed(2)}) did not concentrate enough signal in this query budget.`,
    nextStep: 'Drop pErr below 0.10 or raise availability past 0.80 to see the convergence emerge.',
  }
}

function renderNodeStrip(confidence: number[]): HTMLElement {
  const row = document.createElement('div')
  row.className = 'node-strip'
  confidence.forEach((value) => {
    const cell = document.createElement('div')
    cell.className = 'node-strip-cell'
    cell.style.background = `color-mix(in oklab, var(--success) ${Math.round(value * 100)}%, var(--surface-alt))`
    cell.title = `confidence ${(value * 100).toFixed(1)}%`
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
  seedInput.addEventListener('input', () => { seed = seedInput.value })

  const pErrInput = document.createElement('input')
  pErrInput.type = 'range'
  pErrInput.min = '0'
  pErrInput.max = '0.49'
  pErrInput.step = '0.01'
  pErrInput.value = String(pErr)
  pErrInput.setAttribute('aria-label', 'Oracle error rate')
  pErrInput.addEventListener('input', () => { pErr = Number(pErrInput.value) })

  const alphaInput = document.createElement('input')
  alphaInput.type = 'range'
  alphaInput.min = '0.05'
  alphaInput.max = '1'
  alphaInput.step = '0.01'
  alphaInput.value = String(alpha)
  alphaInput.setAttribute('aria-label', 'Oracle availability')
  alphaInput.addEventListener('input', () => { alpha = Number(alphaInput.value) })

  const run = document.createElement('button')
  run.type = 'button'
  run.className = 'open-btn'
  run.textContent = 'Run oracle replay'

  const runStatus = document.createElement('p')
  runStatus.className = 'run-status'
  runStatus.textContent = 'Ready to run.'

  const progressMount = document.createElement('div')
  progressMount.className = 'output-block progress-mount'
  progressMount.append(renderProgressBar(0, 3))

  const placeholder = document.createElement('section')
  placeholder.className = 'output-block output-placeholder'
  placeholder.innerHTML = `
    <h3 class="card-section-title">Replay output</h3>
    <p>Click <strong>Run oracle replay</strong> to populate this panel. You'll get a verdict banner with the recovered fraction, the convergence curve, and a per-component confidence strip.</p>
  `

  const resultMount = document.createElement('div')
  resultMount.className = 'output-mount'
  resultMount.append(placeholder)

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
    resultMount.classList.add('is-running')
    run.textContent = 'Running replay...'

    const stages = ['Sampling oracle queries...', 'Aggregating LDPC pass...', 'Preparing replay results...']
    for (let index = 0; index < stages.length; index += 1) {
      runStatus.textContent = stages[index] ?? 'Running...'
      progressMount.innerHTML = ''
      progressMount.append(renderProgressBar(index + 1, stages.length))
      await new Promise<void>((resolve) => { window.setTimeout(() => resolve(), 120) })
    }

    const budget = level === 1024 ? 240 : 180
    const result = runDfOracleSim(`${seed}:${level}`, pErr, alpha, budget)
    const finalRecovered = result.recoveredOverQueries[result.recoveredOverQueries.length - 1] ?? 0
    const confidences = result.variables.map((v) => v.confidence)
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / Math.max(1, confidences.length)

    resultMount.innerHTML = ''
    resultMount.classList.remove('is-running')

    const verdict = verdictForDf(finalRecovered, avgConfidence, pErr, alpha)
    resultMount.append(renderVerdictBanner({
      tone: verdict.tone,
      headline: verdict.headline,
      detail: verdict.detail,
      metrics: [
        { label: 'Recovered fraction', value: `${(finalRecovered * 100).toFixed(1)}%` },
        { label: 'Avg confidence', value: `${(avgConfidence * 100).toFixed(1)}%` },
        { label: 'Queries used', value: budget.toString() },
        { label: 'Oracle pErr / α', value: `${pErr.toFixed(2)} / ${alpha.toFixed(2)}` },
      ],
      nextStep: verdict.nextStep,
    }))

    const chartCard = document.createElement('section')
    chartCard.className = 'output-block'
    const chartTitle = document.createElement('h3')
    chartTitle.className = 'card-section-title'
    chartTitle.textContent = 'Recovered fraction over query count'
    chartCard.append(chartTitle, renderTraceViewer(result.recoveredOverQueries, 'var(--mirror-cloud)'))
    resultMount.append(chartCard)

    const stripCard = document.createElement('section')
    stripCard.className = 'output-block'
    const stripTitle = document.createElement('h3')
    stripTitle.className = 'card-section-title'
    stripTitle.textContent = 'Per-component confidence (brighter = stronger inference)'
    stripCard.append(stripTitle, renderNodeStrip(confidences))
    resultMount.append(stripCard)

    runStatus.textContent = 'Replay complete.'
    seedInput.disabled = false
    pErrInput.disabled = false
    alphaInput.disabled = false
    run.disabled = false
    run.textContent = 'Run oracle replay'
  })

  setup.append(seedInput, pErrInput, alphaInput, run)

  card.append(head, setup, runStatus, progressMount, resultMount, chartInterpretation, mapping, renderRealityPanel(imperfectDfReality))
  return card
}
