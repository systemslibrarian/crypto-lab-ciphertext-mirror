export type TraceViewerOptions = {
  color?: string
  /**
   * Fixed amplitude for the y-axis. When several viewers share one scale, pass the
   * global max so curves are visually comparable. Defaults to per-curve auto-scale.
   */
  fixedMaxAbs?: number
  /** Text alternative describing the curve for screen readers. Omit to mark decorative. */
  ariaLabel?: string
  /** 'zero' plots non-negative data from the bottom; 'center' keeps a mid-line baseline. */
  baseline?: 'zero' | 'center'
  /** Caption for the y-axis (e.g. '|correlation|'). */
  yLabel?: string
  /** Caption for the x-axis (e.g. 'traces →'). */
  xLabel?: string
}

/**
 * Canvas 2D cannot resolve CSS custom properties (`var(--x)`) or `color-mix()` that
 * references them — assigning such a string to strokeStyle is silently ignored and the
 * stroke falls back to black. So we resolve `var(--name)` to its concrete value here.
 */
function resolveColor(input: string | undefined, fallback: string): string {
  if (!input) {
    return fallback
  }
  const match = input.match(/^var\((--[\w-]+)\)$/)
  const varName = match?.[1]
  if (
    varName &&
    typeof getComputedStyle === 'function' &&
    typeof document !== 'undefined' &&
    document.documentElement
  ) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
    return value || fallback
  }
  return input
}

export function renderTraceViewer(points: number[], options: TraceViewerOptions = {}): HTMLCanvasElement {
  const { color, fixedMaxAbs, ariaLabel, baseline = 'zero', yLabel, xLabel } = options

  const canvas = document.createElement('canvas')
  canvas.className = 'trace-canvas'
  canvas.width = 720
  canvas.height = 150
  if (ariaLabel) {
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', ariaLabel)
  } else {
    canvas.setAttribute('aria-hidden', 'true')
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return canvas
  }

  const strokeColor = resolveColor(color, '#5ec3de')
  const axisColor = resolveColor('var(--text-muted)', '#8a948c')
  const W = canvas.width
  const H = canvas.height
  const padL = 38
  const padR = 10
  const padT = 12
  const padB = 20
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  ctx.clearRect(0, 0, W, H)

  const maxAbs = fixedMaxAbs && fixedMaxAbs > 0 ? fixedMaxAbs : Math.max(...points.map((p) => Math.abs(p)), 1e-6)

  // Axis frame
  ctx.strokeStyle = axisColor
  ctx.globalAlpha = 0.5
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(padL, padT)
  ctx.lineTo(padL, padT + plotH)
  ctx.lineTo(padL + plotW, padT + plotH)
  ctx.stroke()
  if (baseline === 'center') {
    ctx.beginPath()
    ctx.moveTo(padL, padT + plotH / 2)
    ctx.lineTo(padL + plotW, padT + plotH / 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // Scale labels
  ctx.fillStyle = axisColor
  ctx.font = '10px "IBM Plex Sans", "Segoe UI", sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillText(maxAbs >= 100 ? Math.round(maxAbs).toString() : maxAbs.toFixed(2), padL - 4, padT + 4)
  ctx.fillText(baseline === 'center' ? `-${maxAbs.toFixed(2)}` : '0', padL - 4, padT + plotH - 2)
  if (yLabel) {
    ctx.textAlign = 'left'
    ctx.fillText(yLabel, padL + 2, padT + 4)
  }
  if (xLabel) {
    ctx.textAlign = 'right'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(xLabel, padL + plotW, H - 5)
  }

  if (points.length < 2) {
    return canvas
  }

  const yFor = (value: number): number => {
    if (baseline === 'center') {
      return padT + plotH / 2 - (value / maxAbs) * (plotH / 2)
    }
    return padT + plotH - (value / maxAbs) * plotH
  }

  ctx.strokeStyle = strokeColor
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.beginPath()
  points.forEach((point, index) => {
    const x = padL + (index / (points.length - 1)) * plotW
    const y = yFor(point)
    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.stroke()

  return canvas
}
