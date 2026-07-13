/**
 * Masking mechanism strip.
 *
 * The bar chart above shows the *consequence* (trace counts fan out with masking order);
 * it never shows the *cause*. This strip makes one concrete trace visible, step by step,
 * using the exact same model the full replay measures (see `sampleMaskingMechanism`):
 *
 *   target secret bit  →  XOR-split into d+1 colored share tiles
 *                      →  each tile emits (Hamming weight − 0.5) + Gaussian noise
 *                      →  the leaks multiply into one distinguisher number
 *                      →  that number accumulates, trace by trace, into |correlation|.
 *
 * Watching the product get buried in noise — and needing many traces before the
 * correlation lifts off zero — is what turns "higher order needs more traces" from an
 * assertion into an intuition. Every number shown is computed, never faked.
 */

import type { MechanismSample, MechanismTrace } from '../cards/card-masked-comparison/sim'

function fmt(value: number): string {
  return value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2)
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function renderTraceRow(trace: MechanismTrace, index: number): HTMLElement {
  const row = document.createElement('div')
  row.className = 'mech-trace'

  const head = document.createElement('p')
  head.className = 'mech-trace-head'
  head.innerHTML = `<span class="mech-trace-idx">Trace ${index + 1}</span> device processes decision bit <strong>b = ${trace.decisionBit}</strong>, split into ${trace.shares.length} share${trace.shares.length > 1 ? 's' : ''} (XOR of the bits = b)`
  row.append(head)

  // Share tiles: bit chip + its leak value. Color distinguishes shares but the bit and
  // number are always shown as text (WCAG 1.4.1 — never color alone).
  const flow = document.createElement('div')
  flow.className = 'mech-flow'

  trace.shares.forEach((share, i) => {
    if (i > 0) {
      const xor = document.createElement('span')
      xor.className = 'mech-op'
      xor.setAttribute('aria-hidden', 'true')
      xor.textContent = '⊕'
      flow.append(xor)
    }
    const tile = document.createElement('div')
    tile.className = `mech-tile mech-tile-${i % 4}`
    tile.innerHTML =
      `<span class="mech-tile-role">share ${i}</span>` +
      `<span class="mech-tile-bit">bit ${share.bit}</span>` +
      `<span class="mech-tile-leak">leak ${fmt(share.leak)}</span>` +
      `<span class="mech-tile-calc">(${fmt(share.centered)} HW ${fmt(share.noise)} noise)</span>`
    flow.append(tile)
  })

  const eq = document.createElement('span')
  eq.className = 'mech-op mech-op-combine'
  eq.setAttribute('aria-hidden', 'true')
  eq.textContent = trace.shares.length > 1 ? '⇒ ×' : '⇒'
  flow.append(eq)

  const result = document.createElement('div')
  result.className = 'mech-dist'
  result.innerHTML =
    `<span class="mech-dist-role">distinguisher</span>` +
    `<span class="mech-dist-val">${fmt(trace.distinguisher)}</span>` +
    `<span class="mech-dist-calc">${trace.shares.length > 1 ? 'product of leaks' : 'the leak itself'}</span>`
  flow.append(result)

  row.append(flow)
  return row
}

export function renderMaskingMechanismStrip(sample: MechanismSample): HTMLElement {
  const section = document.createElement('section')
  section.className = 'mech-strip output-block'

  const title = document.createElement('h3')
  title.className = 'card-section-title'
  title.textContent = `One trace, up close — order d=${sample.order} at σ=${sample.sigma.toFixed(2)}`
  section.append(title)

  const intro = document.createElement('p')
  intro.className = 'mech-intro'
  intro.innerHTML = `The bar chart totals tens of thousands of traces. Here are the first few of that same run, decomposed. The attack is resolving one real ML-KEM shared-secret bit — <strong>bit #${sample.targetIndex}, value ${sample.targetBit}</strong>. Each trace the device splits its (toggled) decision bit into ${sample.order + 1} random share${sample.order > 0 ? 's' : ''}; the attacker only sees each share's noisy leak and multiplies them. Watch the running correlation: with more shares and noise it stays near zero far longer — which is <em>why</em> higher order costs more traces.`
  section.append(intro)

  const traceList = document.createElement('div')
  traceList.className = 'mech-trace-list'
  section.append(traceList)

  // Running-correlation readout: the accumulation the traces feed into.
  const accum = document.createElement('div')
  accum.className = 'mech-accum'
  const accumLabel = document.createElement('p')
  accumLabel.className = 'mech-accum-label'
  accumLabel.innerHTML = 'Running |correlation| between distinguisher and decision bit, after each trace shown:'
  const accumTrack = document.createElement('div')
  accumTrack.className = 'mech-accum-track'
  accumTrack.setAttribute('role', 'img')
  const finalCorr = sample.runningCorrelation[sample.runningCorrelation.length - 1] ?? 0
  accumTrack.setAttribute(
    'aria-label',
    `After ${sample.traces.length} traces the running correlation is only ${finalCorr.toFixed(3)} on a 0–1 scale — nowhere near the ~0.95 confidence the full run needs, which is why thousands more traces are required at this order and noise.`,
  )
  accum.append(accumLabel, accumTrack)
  section.append(accum)

  const rmMotion = prefersReducedMotion()

  const reveal = (upTo: number): void => {
    traceList.innerHTML = ''
    accumTrack.innerHTML = ''
    for (let i = 0; i < upTo; i += 1) {
      const trace = sample.traces[i]
      if (trace) traceList.append(renderTraceRow(trace, i))
    }
    sample.runningCorrelation.slice(0, upTo).forEach((corr, i) => {
      const dot = document.createElement('span')
      dot.className = 'mech-accum-dot'
      // Correlation is 0..1; scale height so a near-zero value reads as flat.
      dot.style.height = `${Math.max(4, Math.min(100, corr * 100))}%`
      dot.title = `after trace ${i + 1}: |corr| = ${corr.toFixed(3)}`
      dot.setAttribute('aria-hidden', 'true')
      accumTrack.append(dot)
    })
  }

  const controls = document.createElement('div')
  controls.className = 'mech-controls'

  const replay = document.createElement('button')
  replay.type = 'button'
  replay.className = 'open-btn mech-replay'
  replay.textContent = rmMotion ? 'Show all traces' : 'Replay step by step'

  let timer: number | null = null
  const stop = (): void => {
    if (timer !== null) {
      window.clearInterval(timer)
      timer = null
    }
  }

  const animate = (): void => {
    stop()
    if (rmMotion) {
      reveal(sample.traces.length)
      return
    }
    let shown = 0
    reveal(0)
    replay.disabled = true
    timer = window.setInterval(() => {
      shown += 1
      reveal(shown)
      if (shown >= sample.traces.length) {
        stop()
        replay.disabled = false
      }
    }, 650)
  }

  replay.addEventListener('click', animate)
  controls.append(replay)
  section.append(controls)

  // First paint: reduced-motion users see the full walkthrough immediately; others see
  // it animate once on mount.
  if (rmMotion) reveal(sample.traces.length)
  else animate()

  return section
}
