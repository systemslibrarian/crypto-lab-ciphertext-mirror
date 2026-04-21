import { renderInterpretationBlock } from '../../components/InterpretationBlock'
import { renderPaperMapping } from '../../components/PaperMapping'
import { renderParamSelector } from '../../components/ParamSelector'
import { renderRealityPanel } from '../../components/RealityPanel'
import { renderScholarBadge } from '../../components/ScholarBadge'
import { renderTraceViewer } from '../../components/TraceViewer'
import type { MlKemLevel } from '../../components/types'
import { renderMirror } from '../../lib/viz/mirror'
import { maskedComparisonReality } from './reality'
import { runMaskedComparisonSim } from './sim'

export function renderMaskedComparisonCardView(): HTMLElement {
  const card = document.createElement('section')
  card.className = 'card-shell'

  const head = document.createElement('div')
  head.className = 'card-head'
  const titleBlock = document.createElement('div')
  titleBlock.innerHTML = '<h2>2024/060 - Masked Comparison Leakage</h2><p>FO mirror comparison leakage under masking order escalation.</p>'
  head.append(
    titleBlock,
    renderScholarBadge({
      title: "The Insecurity of Masked Comparisons: SCAs on ML-KEM's FO-Transform",
      year: 2024,
      eprintId: '060',
      authorLine: 'Hermelink et al.',
      url: 'https://eprint.iacr.org/2024/060',
    }),
  )

  const setup = document.createElement('div')
  setup.className = 'card-setup'
  let level: MlKemLevel = 512
  let sigma = 0.6
  let sigmaCompare = 1.2
  let seed = 'mirror-card-1'
  let bitIndex = 0
  let compareMode = false

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

  const bitInput = document.createElement('input')
  bitInput.type = 'number'
  bitInput.min = '0'
  bitInput.max = '255'
  bitInput.value = String(bitIndex)
  bitInput.setAttribute('aria-label', 'Target plaintext bit index')
  bitInput.addEventListener('input', () => {
    const next = Number(bitInput.value)
    bitIndex = Number.isFinite(next) ? Math.max(0, Math.min(255, Math.floor(next))) : 0
    bitInput.value = String(bitIndex)
  })

  const run = document.createElement('button')
  run.type = 'button'
  run.className = 'open-btn'
  run.textContent = 'Run leakage replay'

  const compareWrap = document.createElement('label')
  const compareToggle = document.createElement('input')
  compareToggle.type = 'checkbox'
  compareToggle.addEventListener('change', () => {
    compareMode = compareToggle.checked
    sigmaCompareInput.disabled = !compareMode
  })
  compareWrap.append(compareToggle, document.createTextNode('Enable Run A vs Run B comparison'))

  const sigmaCompareInput = document.createElement('input')
  sigmaCompareInput.type = 'range'
  sigmaCompareInput.min = '0'
  sigmaCompareInput.max = '2'
  sigmaCompareInput.step = '0.05'
  sigmaCompareInput.value = String(sigmaCompare)
  sigmaCompareInput.disabled = true
  sigmaCompareInput.setAttribute('aria-label', 'Comparison noise sigma')
  sigmaCompareInput.addEventListener('input', () => {
    sigmaCompare = Number(sigmaCompareInput.value)
  })

  const panes = document.createElement('div')
  panes.style.display = 'grid'
  panes.style.gap = '0.75rem'
  panes.className = 'output-block'

  const chartInterpretation = renderInterpretationBlock({
    whatSeeing:
      'Each panel plots correlation progression for masking orders d=0..3 from synthetic leakage traces during the replayed FO comparison path.',
    parameterChange:
      'Higher sigma generally suppresses correlation peaks and increases estimated traces needed for confidence; lower sigma does the opposite.',
    whyMatters:
      'This mirrors the paper theme that masking order alone does not remove exploitable structure when enough observations are accumulated.',
    notProve:
      'These curves do not prove real-device exploitability, trace counts, or concrete break cost on hardware implementations.',
  })

  const mapping = renderPaperMapping({
    paperClaim:
      'Higher-order masking of FO comparison can still leak under realistic side-channel observation assumptions.',
    demoModels:
      'Seeded synthetic leakage with configurable Gaussian noise and order-based comparison replay over repeated traces.',
    demoOmits:
      'Real power/EM captures, alignment complexities, and hardware-specific pipeline effects.',
  })

  const mirrorMount = renderMirror('cracked')

  run.addEventListener('click', async () => {
    run.disabled = true
    run.textContent = 'Running...'
    const result = await runMaskedComparisonSim(level, seed, sigma, bitIndex)
    const compareResult = compareMode
      ? await runMaskedComparisonSim(level, `${seed}:compare`, sigmaCompare, bitIndex)
      : null
    panes.innerHTML = ''

    const heading = document.createElement('h3')
    heading.className = 'card-section-title'
    heading.textContent = compareMode ? 'Simulation Output: Run A vs Run B' : 'Simulation Output'
    panes.append(heading)

    ;([0, 1, 2, 3] as const).forEach((order) => {
      const pane = document.createElement('section')
      pane.style.display = 'grid'
      pane.style.gridTemplateColumns = compareResult ? 'repeat(2, minmax(0, 1fr))' : '1fr'
      pane.style.gap = '0.6rem'

      const title = document.createElement('h3')
      title.textContent = `d=${order}`

      const runA = document.createElement('div')
      runA.innerHTML = `<p>Run A (sigma=${sigma.toFixed(2)}): traces for 95% confidence ${result.tracesNeeded95[order]}</p>`
      runA.append(renderTraceViewer(result.curves[order], order === 0 ? 'var(--mirror-crack)' : 'var(--mirror-glow)'))
      pane.append(runA)

      if (compareResult) {
        const runB = document.createElement('div')
        runB.innerHTML = `<p>Run B (sigma=${sigmaCompare.toFixed(2)}): traces for 95% confidence ${compareResult.tracesNeeded95[order]}</p>`
        runB.append(renderTraceViewer(compareResult.curves[order], 'var(--warning)'))
        pane.append(runB)
      }

      panes.append(title, pane)
    })
    run.disabled = false
    run.textContent = 'Run leakage replay'
  })

  setup.append(seedInput, sigmaInput, sigmaCompareInput, bitInput, compareWrap, run)

  card.append(head, setup, mirrorMount, panes, chartInterpretation, mapping, renderRealityPanel(maskedComparisonReality))
  return card
}
