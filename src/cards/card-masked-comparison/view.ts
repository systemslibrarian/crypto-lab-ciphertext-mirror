import { renderCheckboxField, renderSliderField, renderTextField } from '../../components/Field'
import { renderInterpretationBlock } from '../../components/InterpretationBlock'
import { renderPaperMapping } from '../../components/PaperMapping'
import { renderParamSelector } from '../../components/ParamSelector'
import { renderProgressBar } from '../../components/ProgressBar'
import { renderRealityPanel } from '../../components/RealityPanel'
import { renderScholarBadge } from '../../components/ScholarBadge'
import { renderTakeaway } from '../../components/Takeaway'
import { renderTraceBarChart } from '../../components/TraceBarChart'
import { renderTraceViewer } from '../../components/TraceViewer'
import { renderVerdictBanner, type VerdictTone } from '../../components/VerdictBanner'
import type { MlKemLevel } from '../../components/types'
import { maskedComparisonReality } from './reality'
import { MAX_TRACE_ESTIMATE, runMaskedComparisonSim } from './sim'

const ORDERS = [0, 1, 2, 3] as const
type Order = (typeof ORDERS)[number]

const FLOOR_TRACES = MAX_TRACE_ESTIMATE

const TIERS: Array<{ max: number; label: string }> = [
  { max: 10_000, label: 'Trivial recovery tier' },
  { max: 100_000, label: 'Weak — modest noise' },
  { max: 1_000_000, label: 'Moderate effort' },
  { max: 10_000_000, label: 'Strong defense' },
  { max: Number.POSITIVE_INFINITY, label: 'Out of replay reach' },
]

const REFERENCES = [
  { at: 10_000, label: 'unprotected break tier' },
  { at: 1_000_000, label: 'moderate effort' },
  { at: 10_000_000, label: 'strong defense' },
]

function tierFor(value: number): string {
  for (const tier of TIERS) {
    if (value < tier.max) {
      return tier.label
    }
  }
  return 'Out of replay reach'
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function isAtFloor(values: Record<Order, number>): boolean {
  return ORDERS.every((o) => values[o] >= FLOOR_TRACES * 0.999)
}

function bestOrder(values: Record<Order, number>): Order {
  return ORDERS.reduce<Order>((best, o) => (values[o] < values[best] ? o : best), 0 as Order)
}

function compact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return Math.round(value).toLocaleString()
}

type VerdictBundle = { tone: VerdictTone; headline: string; detail: string; nextStep: string }

function verdictForRun(values: Record<Order, number>, sigma: number): VerdictBundle {
  if (isAtFloor(values)) {
    return {
      tone: 'floor',
      headline: 'Noise has buried the channel — no order is distinguishable here',
      detail: `At sigma=${sigma.toFixed(2)} even the unmasked order d=0 falls below the replay's correlation floor, so every estimate pins at the same ceiling. This is the noise dominating, not masking — it would hide an unprotected implementation too.`,
      nextStep:
        'Lower sigma toward 0.6 so the cheapest orders climb above the floor and the order-by-order separation becomes visible.',
    }
  }
  const best = bestOrder(values)
  const bestVal = values[best]
  const worst = ORDERS.reduce<Order>((w, o) => (values[o] > values[w] ? o : w), 0 as Order)
  const worstVal = values[worst]
  const spread = worstVal / Math.max(bestVal, 1)

  if (bestVal < 50_000) {
    return {
      tone: 'bad',
      headline: `Order d=${best} leaks fast — ~${compact(bestVal)} traces is in the practical attacker tier`,
      detail: `The cheapest masked branch reaches 95% confidence in ${bestVal.toLocaleString()} traces. Higher orders cost ${spread.toFixed(1)}× more, but the cheapest path still wins.`,
      nextStep: 'Push sigma higher to see whether the gap between orders widens or collapses to the floor.',
    }
  }
  if (bestVal < 1_000_000) {
    return {
      tone: 'warn',
      headline: `Mixed: best order d=${best} reaches 95% near ${compact(bestVal)} traces`,
      detail: `Distinguishability is reduced but the cheapest order still sits in the moderate-effort tier. Spread across orders is ${spread.toFixed(1)}×.`,
      nextStep: 'Enable Run A vs Run B and lift the second sigma to confirm the trend is monotonic in noise.',
    }
  }
  return {
    tone: 'good',
    headline: `Defense holding — best order needs ~${compact(bestVal)} traces`,
    detail: `Even the cheapest masking order requires ${bestVal.toLocaleString()} traces at 95% confidence. Spread across orders is ${spread.toFixed(1)}×.`,
    nextStep: 'Lower sigma to find the threshold where the defense starts to break down.',
  }
}

export function renderMaskedComparisonCardView(): HTMLElement {
  const card = document.createElement('section')
  card.className = 'card-shell'

  const head = document.createElement('div')
  head.className = 'card-head'
  const titleBlock = document.createElement('div')
  titleBlock.innerHTML =
    '<h2>2024/060 - Masked Comparison Leakage</h2><p>FO mirror comparison leakage under masking order escalation.</p>'
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

  setup.append(
    renderParamSelector(level, (next) => {
      level = next
    }),
  )

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
    // Track the value leniently while typing so multi-digit entry and clearing work.
    const next = Number(bitInput.value)
    bitIndex = Number.isFinite(next) ? Math.max(0, Math.min(255, Math.floor(next))) : 0
  })
  bitInput.addEventListener('change', () => {
    // Normalize the displayed value only once the edit is committed.
    bitInput.value = String(bitIndex)
  })

  const run = document.createElement('button')
  run.type = 'button'
  run.className = 'open-btn'
  run.textContent = 'Run leakage replay'

  const compareToggle = document.createElement('input')
  compareToggle.type = 'checkbox'
  compareToggle.addEventListener('change', () => {
    compareMode = compareToggle.checked
    sigmaCompareInput.disabled = !compareMode
  })
  const compareWrap = renderCheckboxField('Enable Run A vs Run B comparison', compareToggle)

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

  const runStatus = document.createElement('p')
  runStatus.className = 'run-status'
  runStatus.setAttribute('role', 'status')
  runStatus.setAttribute('aria-live', 'polite')
  runStatus.textContent = 'Ready to run.'

  const progressMount = document.createElement('div')
  progressMount.className = 'output-block progress-mount'
  progressMount.append(renderProgressBar(0, 3))

  const placeholder = document.createElement('section')
  placeholder.className = 'output-block output-placeholder'
  placeholder.innerHTML = `
    <h3 class="card-section-title">Replay output</h3>
    <p>Click <strong>Run leakage replay</strong> to populate this panel. You'll get a one-line verdict, a bar chart of trace effort per masking order with reference brackets, and the per-order distinguisher correlation building up across traces inside a collapsed panel.</p>
  `

  const resultMount = document.createElement('div')
  resultMount.className = 'output-mount'
  resultMount.append(placeholder)

  const chartInterpretation = renderInterpretationBlock({
    whatSeeing:
      'Each bar is the traces a higher-order CPA needs at 95% confidence to recover the masked decision bit against masking order d. The distinguisher is the product of the d+1 share leakages — the optimal combiner for Boolean masking.',
    parameterChange:
      "Adding one masking order multiplies the attacker's cost, and raising sigma multiplies it again per order — so the gap between d=0 and d=3 fans out as noise rises. At very low sigma masking barely helps; the orders nearly collapse together.",
    whyMatters:
      'This coupling is the core claim of 2024/060: masking order alone is not a defense. What protects you is order combined with enough noise. Read the chart as "is the cheapest order still in an attacker-feasible tier?"',
    notProve:
      'Trace counts are scaled pedagogical estimates from an idealized single-bit leakage model, not measured break costs against any real implementation.',
  })

  const mapping = renderPaperMapping({
    paperClaim:
      'Higher-order masking of FO comparison can still leak under realistic side-channel observation assumptions.',
    demoModels:
      'Seeded synthetic leakage with configurable Gaussian noise and order-based comparison replay over repeated traces.',
    demoOmits: 'Real power/EM captures, alignment complexities, and hardware-specific pipeline effects.',
  })

  run.addEventListener('click', async () => {
    run.disabled = true
    seedInput.disabled = true
    sigmaInput.disabled = true
    bitInput.disabled = true
    compareToggle.disabled = true
    sigmaCompareInput.disabled = true
    resultMount.classList.add('is-running')
    resultMount.setAttribute('aria-busy', 'true')
    run.textContent = 'Running replay...'

    try {
      const stages = ['Sampling traces...', 'Estimating confidence...', 'Preparing replay results...']
      for (let index = 0; index < stages.length; index += 1) {
        runStatus.textContent = stages[index] ?? 'Running...'
        progressMount.innerHTML = ''
        progressMount.append(renderProgressBar(index + 1, stages.length))
        await new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), 120)
        })
      }

      const result = await runMaskedComparisonSim(level, seed, sigma, bitIndex)
      const compareResult = compareMode
        ? await runMaskedComparisonSim(level, `${seed}:compare`, sigmaCompare, bitIndex)
        : null

      resultMount.innerHTML = ''
      resultMount.classList.remove('is-running')

      const verdictA = verdictForRun(result.tracesNeeded95, sigma)
      const best = bestOrder(result.tracesNeeded95)
      const avgA = average(ORDERS.map((o) => result.tracesNeeded95[o]))
      resultMount.append(
        renderVerdictBanner({
          tone: verdictA.tone,
          headline: verdictA.headline,
          detail: verdictA.detail,
          metrics: [
            { label: 'Best order', value: `d=${best}` },
            { label: 'Best estimate', value: `${compact(result.tracesNeeded95[best])} traces` },
            { label: 'Average across d=0..3', value: compact(avgA) },
            { label: 'Sigma', value: sigma.toFixed(2) },
          ],
          nextStep: verdictA.nextStep,
        }),
      )

      const chartCard = document.createElement('section')
      chartCard.className = 'output-block'
      const chartTitle = document.createElement('h3')
      chartTitle.className = 'card-section-title'
      chartTitle.textContent = 'Traces needed for 95% confidence, per masking order (Run A)'
      chartCard.append(
        chartTitle,
        renderTraceBarChart({
          rows: ORDERS.map((o) => ({
            label: `d=${o}`,
            value: result.tracesNeeded95[o],
            caption: tierFor(result.tracesNeeded95[o]),
            highlight: o === best,
          })),
          references: REFERENCES,
          unitLabel: 'Lower is easier for the attacker. Tick marks show pedagogical reference tiers.',
        }),
      )
      resultMount.append(chartCard)

      if (compareResult) {
        const verdictB = verdictForRun(compareResult.tracesNeeded95, sigmaCompare)
        const bestB = bestOrder(compareResult.tracesNeeded95)
        const avgB = average(ORDERS.map((o) => compareResult.tracesNeeded95[o]))
        resultMount.append(
          renderVerdictBanner({
            tone: verdictB.tone,
            headline: `Run B (sigma=${sigmaCompare.toFixed(2)}): ${verdictB.headline}`,
            detail: verdictB.detail,
            metrics: [
              { label: 'Best order', value: `d=${bestB}` },
              { label: 'Best estimate', value: `${compact(compareResult.tracesNeeded95[bestB])} traces` },
              { label: 'Average', value: compact(avgB) },
              { label: 'Sigma', value: sigmaCompare.toFixed(2) },
            ],
            nextStep: verdictB.nextStep,
          }),
        )

        const chartCardB = document.createElement('section')
        chartCardB.className = 'output-block'
        const chartTitleB = document.createElement('h3')
        chartTitleB.className = 'card-section-title'
        chartTitleB.textContent = 'Traces needed (Run B)'
        chartCardB.append(
          chartTitleB,
          renderTraceBarChart({
            rows: ORDERS.map((o) => ({
              label: `d=${o}`,
              value: compareResult.tracesNeeded95[o],
              caption: tierFor(compareResult.tracesNeeded95[o]),
              highlight: o === bestB,
            })),
            references: REFERENCES,
          }),
        )
        resultMount.append(chartCardB)

        const compareNote = document.createElement('p')
        compareNote.className = 'run-summary'
        const ratio = avgA > 0 ? avgB / avgA : 1
        if (ratio > 1.25) {
          compareNote.textContent = `Run B costs the attacker ~${ratio.toFixed(1)}× more traces on average than Run A — raising sigma from ${sigma.toFixed(2)} to ${sigmaCompare.toFixed(2)} hardened the channel in this replay.`
        } else if (ratio < 0.8) {
          compareNote.textContent = `Run B is ~${(1 / ratio).toFixed(1)}× cheaper than Run A — the second parameter set leaks more in this replay window.`
        } else {
          compareNote.textContent = `Run A and Run B are within ${Math.round(Math.abs(1 - ratio) * 100)}% of each other on average — the parameter shift did not move the needle here.`
        }
        resultMount.append(compareNote)
      }

      const details = document.createElement('details')
      details.className = 'output-block output-details'
      const summary = document.createElement('summary')
      summary.textContent = 'Show distinguisher correlation building up per order'
      details.append(summary)

      const detailsHint = document.createElement('p')
      detailsHint.className = 'run-summary'
      detailsHint.style.margin = '0.4rem 0 0'
      detailsHint.textContent =
        'Each curve is |correlation| as traces accumulate (left → right). Lower orders climb fast to a high plateau; higher orders stay flatter and noisier — that flatness is exactly why they cost more traces.'
      details.append(detailsHint)

      // Shared y-scale across all order curves so a low-signal (high-order) curve
      // actually reads as flatter than the unmasked one, instead of each auto-filling.
      const curveScaleA = Math.max(...ORDERS.flatMap((o) => result.curves[o]), 1e-6)
      const curveScaleB = compareResult ? Math.max(...ORDERS.flatMap((o) => compareResult.curves[o]), 1e-6) : 1e-6

      ORDERS.forEach((order) => {
        const row = document.createElement('div')
        row.className = 'compare-pane'
        row.style.marginTop = '0.75rem'
        const title = document.createElement('h4')
        title.style.margin = '0 0 0.25rem'
        title.textContent = `d=${order}`
        row.append(title)

        const grid = document.createElement('div')
        grid.className = compareResult ? 'compare-split is-two' : 'compare-split'

        const aBox = document.createElement('div')
        aBox.innerHTML = `<p><strong>Run A</strong> (sigma=${sigma.toFixed(2)}): ${compact(result.tracesNeeded95[order])} traces</p>`
        const finalA = result.curves[order][result.curves[order].length - 1] ?? 0
        aBox.append(
          renderTraceViewer(result.curves[order], {
            color: order === 0 ? 'var(--mirror-crack)' : 'var(--mirror-glow)',
            fixedMaxAbs: curveScaleA,
            yLabel: '|corr|',
            xLabel: 'traces →',
            ariaLabel: `Run A order d=${order}: distinguisher correlation settles near ${finalA.toFixed(3)} after ${compact(result.tracesNeeded95[order])} estimated traces.`,
          }),
        )
        grid.append(aBox)

        if (compareResult) {
          const bBox = document.createElement('div')
          bBox.innerHTML = `<p><strong>Run B</strong> (sigma=${sigmaCompare.toFixed(2)}): ${compact(compareResult.tracesNeeded95[order])} traces</p>`
          const finalB = compareResult.curves[order][compareResult.curves[order].length - 1] ?? 0
          bBox.append(
            renderTraceViewer(compareResult.curves[order], {
              color: 'var(--warning)',
              fixedMaxAbs: curveScaleB,
              yLabel: '|corr|',
              xLabel: 'traces →',
              ariaLabel: `Run B order d=${order}: distinguisher correlation settles near ${finalB.toFixed(3)} after ${compact(compareResult.tracesNeeded95[order])} estimated traces.`,
            }),
          )
          grid.append(bBox)
        }
        row.append(grid)
        details.append(row)
      })
      resultMount.append(details)

      runStatus.textContent = `Replay complete. ${verdictA.headline}.`
    } catch (error) {
      console.error('Masked comparison replay failed', error)
      resultMount.innerHTML =
        '<section class="output-block"><p class="run-status">The replay hit an unexpected error and was halted. Adjust the parameters and run again.</p></section>'
      runStatus.textContent = 'Replay failed. Adjust the parameters and run again.'
    } finally {
      resultMount.classList.remove('is-running')
      resultMount.setAttribute('aria-busy', 'false')
      seedInput.disabled = false
      sigmaInput.disabled = false
      bitInput.disabled = false
      compareToggle.disabled = false
      sigmaCompareInput.disabled = !compareMode
      run.disabled = false
      run.textContent = 'Run leakage replay'
    }
  })

  setup.append(
    renderTextField('Seed', seedInput),
    renderSliderField('Noise σ (Run A)', sigmaInput),
    renderSliderField('Noise σ (Run B)', sigmaCompareInput),
    renderTextField('Target bit (0–255)', bitInput),
    compareWrap,
    run,
  )

  const takeaway = renderTakeaway({
    takeaway:
      "Masking order alone is not a defense. Each extra share multiplies the attacker's trace cost only when there is enough noise to hide the combined leakage — at low σ even d=3 falls quickly.",
    experiments: [
      'Set σ to 0.20 and run: the four orders barely separate — masking is nearly useless without noise.',
      'Raise σ to 1.5: now d=3 costs thousands of times more than d=0. Order + noise is what protects you.',
      'Enable Run A vs Run B with σ=0.6 and σ=1.2 to watch the order gap fan out as noise rises.',
    ],
  })

  card.append(
    head,
    takeaway,
    setup,
    runStatus,
    progressMount,
    resultMount,
    chartInterpretation,
    mapping,
    renderRealityPanel(maskedComparisonReality),
  )
  return card
}
