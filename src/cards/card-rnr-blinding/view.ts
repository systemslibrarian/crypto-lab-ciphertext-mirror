import { renderInterpretationBlock } from '../../components/InterpretationBlock'
import { renderPaperMapping } from '../../components/PaperMapping'
import { renderParamSelector } from '../../components/ParamSelector'
import { renderProgressBar } from '../../components/ProgressBar'
import { renderRealityPanel } from '../../components/RealityPanel'
import { renderScholarBadge } from '../../components/ScholarBadge'
import { renderTraceViewer } from '../../components/TraceViewer'
import { renderVerdictBanner, type VerdictTone } from '../../components/VerdictBanner'
import type { MlKemLevel } from '../../components/types'
import { rnrBlindingReality } from './reality'
import { runBlindingSim } from './sim'

function meanAbs(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((acc, v) => acc + Math.abs(v), 0) / values.length
}

type Verdict = { tone: VerdictTone; headline: string; detail: string; nextStep: string }

function verdictForBlinding(
  unblinded: number[],
  blinded: number[],
  unblindedState: string,
  blindedState: string,
  fault: boolean,
): Verdict {
  const ua = meanAbs(unblinded)
  const ba = meanAbs(blinded)
  const ratio = ua > 1e-9 ? ba / ua : 1
  const reduction = ratio < 1 ? `${Math.round((1 - ratio) * 100)}% lower amplitude` : `${ratio.toFixed(2)}× amplitude`

  if (fault && blindedState === 'ABORT' && unblindedState !== 'ABORT') {
    return {
      tone: 'good',
      headline: 'Blinding caught the fault — unblinded path tampered, blinded path aborted',
      detail: `Run B aborted on the integrity check while Run A returned ${unblindedState}, exactly the asymmetry the paper highlights.`,
      nextStep: 'Disable fault injection and rerun to compare amplitude only, isolating the side-channel benefit.',
    }
  }
  if (ratio < 0.6) {
    return {
      tone: 'good',
      headline: `Blinded waveform is ${reduction} than unblinded`,
      detail: `Run A → ${unblindedState}, Run B → ${blindedState}. The blinded branch suppresses the visible leakage envelope at this sigma.`,
      nextStep: 'Raise sigma to test whether the gap survives heavier noise, or enable fault injection to stress integrity.',
    }
  }
  if (ratio < 0.9) {
    return {
      tone: 'warn',
      headline: `Modest reduction — blinded is ${reduction} than unblinded`,
      detail: `Run A → ${unblindedState}, Run B → ${blindedState}. The defense narrows the leakage but does not eliminate the trend.`,
      nextStep: 'Try a different seed to confirm the trend isn\'t seed-specific, then sweep sigma.',
    }
  }
  return {
    tone: 'neutral',
    headline: 'Both branches present similar amplitude in this run',
    detail: `Run A → ${unblindedState}, Run B → ${blindedState}. Relative blinded/unblinded mean amplitude is ${ratio.toFixed(2)} — no clear visual separation here.`,
    nextStep: 'Lower sigma so the unblinded path leaks more strongly and the contrast becomes visible.',
  }
}

export function renderRnrBlindingCardView(): HTMLElement {
  const card = document.createElement('section')
  card.className = 'card-shell'

  const head = document.createElement('div')
  head.className = 'card-head'
  const titleBlock = document.createElement('div')
  titleBlock.innerHTML = '<h2>2025/181 - NTT + CRT RNR Blinding</h2><p>Compare unblinded and blinded pipelines under identical leakage conditions.</p>'
  head.append(
    titleBlock,
    renderScholarBadge({
      title: 'Improved NTT and CRT-based RNR Blinding for Side-Channel and Fault Resistant Kyber',
      year: 2025,
      eprintId: '181',
      authorLine: 'Duparc, Taha',
      url: 'https://eprint.iacr.org/2025/181',
    }),
  )

  const setup = document.createElement('div')
  setup.className = 'card-setup'
  let level: MlKemLevel = 1024
  let seed = 'mirror-card-3'
  let sigma = 0.6
  let injectFault = false

  setup.append(renderParamSelector(level, (next) => { level = next }))

  const seedInput = document.createElement('input')
  seedInput.value = seed
  seedInput.setAttribute('aria-label', 'Simulation seed')
  seedInput.addEventListener('input', () => { seed = seedInput.value })

  const sigmaInput = document.createElement('input')
  sigmaInput.type = 'range'
  sigmaInput.min = '0'
  sigmaInput.max = '2'
  sigmaInput.step = '0.05'
  sigmaInput.value = String(sigma)
  sigmaInput.setAttribute('aria-label', 'Noise sigma')
  sigmaInput.addEventListener('input', () => { sigma = Number(sigmaInput.value) })

  const faultWrap = document.createElement('label')
  const faultToggle = document.createElement('input')
  faultToggle.type = 'checkbox'
  faultToggle.addEventListener('change', () => { injectFault = faultToggle.checked })
  faultWrap.append(faultToggle, document.createTextNode('Enable single-bit fault injection'))

  const run = document.createElement('button')
  run.type = 'button'
  run.className = 'open-btn'
  run.textContent = 'Run blinding replay'

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
    <p>Click <strong>Run blinding replay</strong> to populate this panel. You'll see a verdict banner comparing both branches and the matched A/B correlation traces.</p>
  `

  const resultMount = document.createElement('div')
  resultMount.className = 'output-mount'
  resultMount.append(placeholder)

  const compareInterpretation = renderInterpretationBlock({
    whatSeeing:
      'Two matched runs under the same seed/noise show leakage trend differences between unblinded and blinded paths.',
    parameterChange:
      'Higher noise can flatten both traces, while fault injection stresses the unblinded path and may alter state outcomes.',
    whyMatters:
      'The side-by-side layout makes defense impact explicit instead of relying on absolute values from a single run.',
    notProve:
      'It does not prove formal masking security or implementation resistance on production hardware.',
  })

  const mapping = renderPaperMapping({
    paperClaim:
      'RNR blinding in NTT/CRT pipelines improves resilience to side-channel and certain fault scenarios for Kyber-like flows.',
    demoModels:
      'A deterministic A/B replay with matched seeds comparing synthetic leakage correlation and branch state outcomes.',
    demoOmits:
      'Hardware fault model fidelity, exact instruction-level countermeasures, and complete performance overhead analysis.',
  })

  run.addEventListener('click', async () => {
    run.disabled = true
    seedInput.disabled = true
    sigmaInput.disabled = true
    faultToggle.disabled = true
    resultMount.classList.add('is-running')
    run.textContent = 'Running replay...'

    const stages = ['Running unblinded branch...', 'Running blinded branch...', 'Preparing replay results...']
    for (let index = 0; index < stages.length; index += 1) {
      runStatus.textContent = stages[index] ?? 'Running...'
      progressMount.innerHTML = ''
      progressMount.append(renderProgressBar(index + 1, stages.length))
      await new Promise<void>((resolve) => { window.setTimeout(() => resolve(), 120) })
    }

    const result = runBlindingSim(`${seed}:${level}`, sigma, injectFault)
    const ua = meanAbs(result.unblindedCorrelation)
    const ba = meanAbs(result.blindedCorrelation)
    const ratio = ua > 1e-9 ? ba / ua : 1

    resultMount.innerHTML = ''
    resultMount.classList.remove('is-running')

    const verdict = verdictForBlinding(
      result.unblindedCorrelation,
      result.blindedCorrelation,
      result.unblindedState,
      result.blindedState,
      injectFault,
    )
    resultMount.append(renderVerdictBanner({
      tone: verdict.tone,
      headline: verdict.headline,
      detail: verdict.detail,
      metrics: [
        { label: 'Run A state', value: result.unblindedState },
        { label: 'Run B state', value: result.blindedState },
        { label: 'Mean |corr| Run A', value: ua.toFixed(3) },
        { label: 'Mean |corr| Run B', value: ba.toFixed(3) },
        { label: 'B / A ratio', value: ratio.toFixed(2) },
        { label: 'Sigma / fault', value: `${sigma.toFixed(2)} / ${injectFault ? 'on' : 'off'}` },
      ],
      nextStep: verdict.nextStep,
    }))

    const compare = document.createElement('section')
    compare.className = 'output-block'
    const compareTitle = document.createElement('h3')
    compareTitle.className = 'card-section-title'
    compareTitle.textContent = 'Unblinded vs blinded correlation (matched seed)'
    compare.append(compareTitle)

    const grid = document.createElement('div')
    grid.style.display = 'grid'
    grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(260px, 1fr))'
    grid.style.gap = '0.75rem'

    const left = document.createElement('section')
    left.className = 'compare-pane'
    left.innerHTML = '<h4>Run A — Unblinded</h4>'
    left.append(renderTraceViewer(result.unblindedCorrelation, 'var(--mirror-crack)'))
    const right = document.createElement('section')
    right.className = 'compare-pane'
    right.innerHTML = '<h4>Run B — Blinded</h4>'
    right.append(renderTraceViewer(result.blindedCorrelation, 'var(--success)'))
    grid.append(left, right)
    compare.append(grid)
    resultMount.append(compare)

    runStatus.textContent = 'Replay complete.'
    seedInput.disabled = false
    sigmaInput.disabled = false
    faultToggle.disabled = false
    run.disabled = false
    run.textContent = 'Run blinding replay'
  })

  setup.append(seedInput, sigmaInput, faultWrap, run)

  card.append(head, setup, runStatus, progressMount, resultMount, compareInterpretation, mapping, renderRealityPanel(rnrBlindingReality))
  return card
}
