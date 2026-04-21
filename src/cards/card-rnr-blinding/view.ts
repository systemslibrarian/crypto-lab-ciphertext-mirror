import { renderInterpretationBlock } from '../../components/InterpretationBlock'
import { renderPaperMapping } from '../../components/PaperMapping'
import { renderParamSelector } from '../../components/ParamSelector'
import { renderRealityPanel } from '../../components/RealityPanel'
import { renderScholarBadge } from '../../components/ScholarBadge'
import { renderTraceViewer } from '../../components/TraceViewer'
import type { MlKemLevel } from '../../components/types'
import { renderMirror } from '../../lib/viz/mirror'
import { rnrBlindingReality } from './reality'
import { runBlindingSim } from './sim'

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
  seedInput.addEventListener('input', () => {
    seed = seedInput.value
  })

  const sigmaInput = document.createElement('input')
  sigmaInput.type = 'range'
  sigmaInput.min = '0'
  sigmaInput.max = '2'
  sigmaInput.step = '0.05'
  sigmaInput.value = String(sigma)
  sigmaInput.setAttribute('aria-label', 'Noise sigma')
  sigmaInput.addEventListener('input', () => {
    sigma = Number(sigmaInput.value)
  })

  const faultWrap = document.createElement('label')
  const faultToggle = document.createElement('input')
  faultToggle.type = 'checkbox'
  faultToggle.addEventListener('change', () => {
    injectFault = faultToggle.checked
  })
  faultWrap.append(faultToggle, document.createTextNode('Enable single-bit fault injection'))

  const run = document.createElement('button')
  run.type = 'button'
  run.className = 'open-btn'
  run.textContent = 'Run blinding replay'

  const compare = document.createElement('div')
  compare.className = 'output-block'
  compare.style.display = 'grid'
  compare.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))'
  compare.style.gap = '1rem'

  const outputRow = document.createElement('p')
  outputRow.className = 'output-block'
  outputRow.textContent = 'shared secret status: pending'

  const compareTitle = document.createElement('h3')
  compareTitle.className = 'card-section-title'
  compareTitle.textContent = 'Simulation Output: Unblinded vs Blinded Correlation'
  compare.append(compareTitle)

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

  const statusInterpretation = renderInterpretationBlock({
    whatSeeing:
      'The status line summarizes resulting shared-secret state labels for unblinded and blinded replay branches.',
    parameterChange:
      'Fault toggle and noise level can change whether either branch reports a degraded or stable state label.',
    whyMatters:
      'A compact textual status helps connect waveform intuition to high-level decapsulation outcome categories.',
    notProve:
      'State labels in this demo are pedagogical outputs and are not substitute metrics for full protocol security claims.',
  })

  const mapping = renderPaperMapping({
    paperClaim:
      'RNR blinding in NTT/CRT pipelines improves resilience to side-channel and certain fault scenarios for Kyber-like flows.',
    demoModels:
      'A deterministic A/B replay with matched seeds comparing synthetic leakage correlation and branch state outcomes.',
    demoOmits:
      'Hardware fault model fidelity, exact instruction-level countermeasures, and complete performance overhead analysis.',
  })

  run.addEventListener('click', () => {
    run.disabled = true
    run.textContent = 'Running...'
    const result = runBlindingSim(`${seed}:${level}`, sigma, injectFault)
    compare.innerHTML = ''
    compare.append(compareTitle)

    const left = document.createElement('section')
    left.innerHTML = '<h3>Unblinded</h3>'
    left.append(renderMirror('cracked'), renderTraceViewer(result.unblindedCorrelation, 'var(--mirror-crack)'))

    const right = document.createElement('section')
    right.innerHTML = '<h3>Blinded</h3>'
    right.append(renderMirror('hardened'), renderTraceViewer(result.blindedCorrelation, 'var(--success)'))

    compare.append(left, right)
    outputRow.textContent = `Unblinded: ${result.unblindedState} | Blinded: ${result.blindedState}`
    run.disabled = false
    run.textContent = 'Run blinding replay'
  })

  setup.append(seedInput, sigmaInput, faultWrap, run)
  card.append(
    head,
    setup,
    compare,
    compareInterpretation,
    outputRow,
    statusInterpretation,
    mapping,
    renderRealityPanel(rnrBlindingReality),
  )
  return card
}
