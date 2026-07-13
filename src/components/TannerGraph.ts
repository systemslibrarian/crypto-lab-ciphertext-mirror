/**
 * Tanner-graph belief-propagation visualizer for the DF-oracle card.
 *
 * The card's core claim — a coin-flip-noisy, mostly-silent oracle still recovers the key
 * because parity checks fix errors — is the one thing the demo previously asserted but
 * never showed. This renders the six variable nodes and their parity-check nodes, draws
 * the Tanner edges, and steps through the *real* BP iterations from `runToyBp`: variable 2
 * starts red (its channel reading is wrong), messages flow along the edges, and the two
 * checks it shares agree it must flip — turning it green. Nothing here is scripted; the
 * per-iteration state comes straight from the sum-product decoder.
 */

import { canonicalToy, runToyBp, type ToyBpFrame, type ToyBpToy } from '../lib/leakage/toy-bp'

const VAR_LABELS = ['v0', 'v1', 'v2', 'v3', 'v4', 'v5']

// Layout coordinates in the SVG viewBox (0..320 × 0..200).
const VAR_POS = [
  { x: 30, y: 150 },
  { x: 88, y: 150 },
  { x: 146, y: 150 },
  { x: 204, y: 150 },
  { x: 262, y: 150 },
  { x: 300, y: 150 },
]
const CHECK_POS = [
  { x: 100, y: 40 },
  { x: 210, y: 40 },
]

function decisionText(frame: ToyBpFrame): string {
  return frame.decisions.map((d, i) => `${VAR_LABELS[i]}=${d}${frame.correct[i] ? '' : ' (wrong)'}`).join(', ')
}

export function renderTannerGraph(toy: ToyBpToy = canonicalToy()): HTMLElement {
  const frames = runToyBp(toy, 6)

  const wrap = document.createElement('section')
  wrap.className = 'tanner output-block'

  const title = document.createElement('h3')
  title.className = 'card-section-title'
  title.textContent = 'How parity checks repair a wrong guess (belief propagation)'
  wrap.append(title)

  const intro = document.createElement('p')
  intro.className = 'tanner-intro'
  intro.innerHTML =
    'This is the counterintuitive core of the attack, on a 6-bit toy running the <em>same</em> sum-product decoder as the full run. Variable <strong>v2</strong> starts with a <strong>wrong</strong> channel reading (red). It sits in two parity checks. As messages pass along the edges, both checks — satisfied by the true bits — agree that v2 must flip, and it turns green. Step through it:'
  wrap.append(intro)

  const stage = document.createElement('div')
  stage.className = 'tanner-stage'

  const NS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', '0 0 330 200')
  svg.setAttribute('class', 'tanner-svg')
  svg.setAttribute('role', 'img')
  stage.append(svg)

  // Edges first (under nodes).
  const edgeEls: Array<{ el: SVGLineElement; check: number; varIdx: number }> = []
  toy.checks.forEach((vars, ci) => {
    vars.forEach((v) => {
      const line = document.createElementNS(NS, 'line')
      line.setAttribute('x1', String(CHECK_POS[ci]!.x))
      line.setAttribute('y1', String(CHECK_POS[ci]!.y))
      line.setAttribute('x2', String(VAR_POS[v]!.x))
      line.setAttribute('y2', String(VAR_POS[v]!.y))
      line.setAttribute('class', 'tanner-edge')
      svg.append(line)
      edgeEls.push({ el: line, check: ci, varIdx: v })
    })
  })

  // Check nodes (squares).
  const checkEls: SVGRectElement[] = []
  CHECK_POS.forEach((pos, ci) => {
    const rect = document.createElementNS(NS, 'rect')
    rect.setAttribute('x', String(pos.x - 13))
    rect.setAttribute('y', String(pos.y - 13))
    rect.setAttribute('width', '26')
    rect.setAttribute('height', '26')
    rect.setAttribute('rx', '4')
    rect.setAttribute('class', 'tanner-check')
    svg.append(rect)
    const label = document.createElementNS(NS, 'text')
    label.setAttribute('x', String(pos.x))
    label.setAttribute('y', String(pos.y + 4))
    label.setAttribute('text-anchor', 'middle')
    label.setAttribute('class', 'tanner-check-label')
    label.textContent = `c${ci}`
    svg.append(label)
    checkEls.push(rect)
  })

  // Variable nodes (circles) + labels.
  const varEls: SVGCircleElement[] = []
  VAR_POS.forEach((pos) => {
    const circle = document.createElementNS(NS, 'circle')
    circle.setAttribute('cx', String(pos.x))
    circle.setAttribute('cy', String(pos.y))
    circle.setAttribute('r', '13')
    circle.setAttribute('class', 'tanner-var')
    svg.append(circle)
    const label = document.createElementNS(NS, 'text')
    label.setAttribute('x', String(pos.x))
    label.setAttribute('y', String(pos.y + 4))
    label.setAttribute('text-anchor', 'middle')
    label.setAttribute('class', 'tanner-var-label')
    svg.append(label)
    varEls.push(circle)
    ;(circle as SVGCircleElement & { _label?: SVGTextElement })._label = label
  })

  stage.append(svg)
  wrap.append(stage)

  // Live status line (announced) + step controls.
  const status = document.createElement('p')
  status.className = 'tanner-status'
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  wrap.append(status)

  const controls = document.createElement('div')
  controls.className = 'tanner-controls'
  const prev = document.createElement('button')
  prev.type = 'button'
  prev.className = 'open-btn'
  prev.textContent = 'Previous step'
  const next = document.createElement('button')
  next.type = 'button'
  next.className = 'open-btn'
  next.textContent = 'Next step'
  const stepLabel = document.createElement('span')
  stepLabel.className = 'tanner-step-label'
  controls.append(prev, stepLabel, next)
  wrap.append(controls)

  let idx = 0

  const paint = (): void => {
    const frame = frames[idx]!
    varEls.forEach((circle, v) => {
      const correct = frame.correct[v]
      circle.classList.toggle('is-correct', !!correct)
      circle.classList.toggle('is-wrong', !correct)
      const label = (circle as SVGCircleElement & { _label?: SVGTextElement })._label
      if (label) label.textContent = `${VAR_LABELS[v]}=${frame.decisions[v]}`
    })
    // Emphasize edges once messages are flowing (iteration >= 1).
    edgeEls.forEach(({ el, varIdx }) => {
      el.classList.toggle('is-active', frame.iteration >= 1 && varIdx === 2)
    })
    checkEls.forEach((rect) => rect.classList.toggle('is-active', frame.iteration >= 1))

    const anyWrong = frame.correct.some((c) => !c)
    stepLabel.textContent = frame.iteration === 0 ? 'Start (channel readings only)' : `BP iteration ${frame.iteration}`
    if (frame.iteration === 0) {
      status.textContent = `Channel readings before any message passing: ${decisionText(frame)}. v2 is read wrong.`
    } else if (anyWrong) {
      status.textContent = `Iteration ${frame.iteration}: messages passing — ${decisionText(frame)}.`
    } else {
      status.textContent = `Iteration ${frame.iteration}: all six bits now agree with the parity checks — v2 was repaired. ${decisionText(frame)}.`
    }
    svg.setAttribute(
      'aria-label',
      `Tanner graph at ${frame.iteration === 0 ? 'the initial channel reading' : `belief-propagation iteration ${frame.iteration}`}: ${decisionText(frame)}.`,
    )
    prev.disabled = idx === 0
    next.disabled = idx === frames.length - 1
  }

  prev.addEventListener('click', () => {
    if (idx > 0) {
      idx -= 1
      paint()
    }
  })
  next.addEventListener('click', () => {
    if (idx < frames.length - 1) {
      idx += 1
      paint()
    }
  })

  paint()
  return wrap
}
