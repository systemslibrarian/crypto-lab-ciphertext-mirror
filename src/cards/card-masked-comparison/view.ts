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
  let seed = 'mirror-card-1'
  let bitIndex = 0

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

  const panes = document.createElement('div')
  panes.style.display = 'grid'
  panes.style.gap = '0.75rem'

  const mirrorMount = renderMirror('cracked')

  run.addEventListener('click', async () => {
    run.disabled = true
    run.textContent = 'Running...'
    const result = await runMaskedComparisonSim(level, seed, sigma, bitIndex)
    panes.innerHTML = ''
    ;([0, 1, 2, 3] as const).forEach((order) => {
      const pane = document.createElement('section')
      const title = document.createElement('h3')
      title.textContent = `d=${order} | traces for 95% confidence: ${result.tracesNeeded95[order]}`
      pane.append(title, renderTraceViewer(result.curves[order], order === 0 ? 'var(--mirror-crack)' : 'var(--mirror-glow)'))
      panes.append(pane)
    })
    run.disabled = false
    run.textContent = 'Run leakage replay'
  })

  setup.append(seedInput, sigmaInput, bitInput, run)

  card.append(head, setup, mirrorMount, panes, renderRealityPanel(maskedComparisonReality))
  return card
}
