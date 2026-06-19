import { renderCheckboxField, renderSliderField, renderTextField } from '../../components/Field'
import { renderInterpretationBlock } from '../../components/InterpretationBlock'
import { renderPaperMapping } from '../../components/PaperMapping'
import { renderParamSelector } from '../../components/ParamSelector'
import { renderProgressBar } from '../../components/ProgressBar'
import { renderRealityPanel } from '../../components/RealityPanel'
import { renderScholarBadge } from '../../components/ScholarBadge'
import { renderTakeaway } from '../../components/Takeaway'
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
  const reduction = ratio < 1 ? `${Math.round((1 - ratio) * 100)}% lower` : `${ratio.toFixed(2)}× higher`

  if (fault && blindedState === 'ABORT' && unblindedState !== 'ABORT') {
    return {
      tone: 'good',
      headline: 'Blinding caught the fault — unblinded path tampered, blinded path aborted',
      detail: `Run B aborted on the integrity check while Run A returned ${unblindedState}, exactly the asymmetry the paper highlights.`,
      nextStep: 'Disable fault injection and rerun to compare leakage only, isolating the side-channel benefit.',
    }
  }
  if (ratio < 0.6) {
    return {
      tone: 'good',
      headline: `Blinding holds — leakage correlation is ${reduction} than unblinded`,
      detail: `Run A → ${unblindedState}, Run B → ${blindedState}. The random mask decorrelates the blinded path's leakage from the secret at this sigma.`,
      nextStep:
        'Raise sigma to test whether the gap survives heavier noise, or enable fault injection to stress integrity.',
    }
  }
  if (ratio < 0.9) {
    return {
      tone: 'warn',
      headline: `Modest reduction — blinded leakage is ${reduction} than unblinded`,
      detail: `Run A → ${unblindedState}, Run B → ${blindedState}. The defense narrows the correlation but does not eliminate the trend in this run.`,
      nextStep: "Try a different seed to confirm the trend isn't seed-specific, then sweep sigma.",
    }
  }
  return {
    tone: 'neutral',
    headline: 'Both branches show similar leakage correlation in this run',
    detail: `Run A → ${unblindedState}, Run B → ${blindedState}. Relative blinded/unblinded mean correlation is ${ratio.toFixed(2)} — no clear separation here.`,
    nextStep: 'Lower sigma so the unblinded path leaks more strongly and the contrast becomes visible.',
  }
}

export function renderRnrBlindingCardView(): HTMLElement {
  const card = document.createElement('section')
  card.className = 'card-shell'

  const head = document.createElement('div')
  head.className = 'card-head'
  const titleBlock = document.createElement('div')
  titleBlock.innerHTML =
    '<h2>2025/181 - NTT + CRT RNR Blinding</h2><p>Compare unblinded and blinded pipelines under identical leakage conditions.</p>'
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

  const faultToggle = document.createElement('input')
  faultToggle.type = 'checkbox'
  faultToggle.addEventListener('change', () => {
    injectFault = faultToggle.checked
  })
  const faultWrap = renderCheckboxField('Enable single-bit fault injection', faultToggle)

  const run = document.createElement('button')
  run.type = 'button'
  run.className = 'open-btn'
  run.textContent = 'Run blinding replay'

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
    <p>Click <strong>Run blinding replay</strong> to populate this panel. You'll see a verdict banner comparing both branches and the matched A/B CPA correlation curves — unblinded climbing while blinded stays flat.</p>
  `

  const resultMount = document.createElement('div')
  resultMount.className = 'output-mount'
  resultMount.append(placeholder)

  const compareInterpretation = renderInterpretationBlock({
    whatSeeing:
      'Both panes run the same CPA distinguisher (correlating leakage against the correct-key Hamming-weight prediction) on a pointwise NTT multiply. Run A is unblinded; Run B adds an RNR random mask before the value is processed.',
    parameterChange:
      "The unblinded correlation climbs to a high plateau; the blinded one stays pinned near zero because the fresh mask is independent of the attacker's prediction. Raising noise lowers the unblinded plateau but the blinded path was already decorrelated. Fault injection trips the blinded path's integrity check (ABORT) while the unblinded path silently returns a tampered result.",
    whyMatters:
      "The defense gap is emergent, not staged: the blinded curve is flat because the math decorrelates it, demonstrating the paper's claim that RNR blinding removes the exploitable side-channel and adds fault detection.",
    notProve:
      "It does not prove formal masking security, model real hardware fault fidelity, or measure the blinding's performance overhead.",
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

    try {
      const stages = ['Running unblinded branch...', 'Running blinded branch...', 'Preparing replay results...']
      for (let index = 0; index < stages.length; index += 1) {
        runStatus.textContent = stages[index] ?? 'Running...'
        progressMount.innerHTML = ''
        progressMount.append(renderProgressBar(index + 1, stages.length))
        await new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), 120)
        })
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
      resultMount.append(
        renderVerdictBanner({
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
        }),
      )

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

      // Shared scale so the blinded curve visibly reads as flat against the unblinded one.
      const corrScale = Math.max(...result.unblindedCorrelation, ...result.blindedCorrelation, 1e-6)

      const left = document.createElement('section')
      left.className = 'compare-pane'
      left.innerHTML = '<h4>Run A — Unblinded</h4>'
      left.append(
        renderTraceViewer(result.unblindedCorrelation, {
          color: 'var(--mirror-crack)',
          fixedMaxAbs: corrScale,
          yLabel: '|corr|',
          xLabel: 'traces →',
          ariaLabel: `Unblinded path: leakage correlation with the secret climbs to ${ua.toFixed(3)} — the key leaks.`,
        }),
      )
      const right = document.createElement('section')
      right.className = 'compare-pane'
      right.innerHTML = '<h4>Run B — Blinded</h4>'
      right.append(
        renderTraceViewer(result.blindedCorrelation, {
          color: 'var(--success)',
          fixedMaxAbs: corrScale,
          yLabel: '|corr|',
          xLabel: 'traces →',
          ariaLabel: `Blinded path: correlation stays near ${ba.toFixed(3)} — the random mask decorrelates the leakage.`,
        }),
      )
      grid.append(left, right)
      compare.append(grid)
      resultMount.append(compare)

      runStatus.textContent = 'Replay complete.'
    } catch (error) {
      console.error('RNR blinding replay failed', error)
      resultMount.innerHTML =
        '<section class="output-block"><p class="run-status">The replay hit an unexpected error and was halted. Adjust the parameters and run again.</p></section>'
      runStatus.textContent = 'Replay failed.'
    } finally {
      resultMount.classList.remove('is-running')
      seedInput.disabled = false
      sigmaInput.disabled = false
      faultToggle.disabled = false
      run.disabled = false
      run.textContent = 'Run blinding replay'
    }
  })

  setup.append(renderTextField('Seed', seedInput), renderSliderField('Noise σ', sigmaInput), faultWrap, run)

  const takeaway = renderTakeaway({
    takeaway:
      'Blinding removes the leak at its source. Because a fresh random mask is added before the value is processed, the leakage no longer tracks the secret — the blinded curve stays flat no matter the noise, and the integrity check catches injected faults.',
    experiments: [
      'Run with fault injection off: the unblinded curve climbs while the blinded one stays pinned near zero.',
      'Lower σ to 0.2: the unblinded path leaks even harder, yet blinding still holds flat.',
      'Turn on fault injection: the blinded path ABORTs while the unblinded path silently returns a tampered result.',
    ],
  })

  card.append(
    head,
    takeaway,
    setup,
    runStatus,
    progressMount,
    resultMount,
    compareInterpretation,
    mapping,
    renderRealityPanel(rnrBlindingReality),
  )
  return card
}
