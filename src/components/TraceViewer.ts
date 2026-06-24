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

/** Logical drawing size (CSS px). The backing store is scaled up by devicePixelRatio. */
const LOGICAL_W = 720
const LOGICAL_H = 150

export function renderTraceViewer(points: number[], options: TraceViewerOptions = {}): HTMLCanvasElement {
  const { color, fixedMaxAbs, ariaLabel, baseline = 'zero', yLabel, xLabel } = options

  const canvas = document.createElement('canvas')
  canvas.className = 'trace-canvas'
  // Seed the intrinsic ratio so `height:auto` lays the element out before the first draw.
  canvas.width = LOGICAL_W
  canvas.height = LOGICAL_H
  if (ariaLabel) {
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', ariaLabel)
  } else {
    canvas.setAttribute('aria-hidden', 'true')
  }

  const strokeColor = resolveColor(color, '#5ec3de')
  const axisColor = resolveColor('var(--text-muted)', '#8a948c')

  const draw = (): void => {
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    // Match the backing store to the displayed CSS size × devicePixelRatio so the curve
    // is crisp on HiDPI screens and never stretched by the `width:100%` layout. The
    // logical coordinate system stays in CSS pixels via setTransform, preserving the
    // 720:150 aspect so `height:auto` does not drift (and the ResizeObserver below
    // does not loop).
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1
    const W = canvas.clientWidth || LOGICAL_W
    const H = W * (LOGICAL_H / LOGICAL_W)
    const backingW = Math.max(1, Math.round(W * dpr))
    const backingH = Math.max(1, Math.round(H * dpr))
    if (canvas.width !== backingW) {
      canvas.width = backingW
    }
    if (canvas.height !== backingH) {
      canvas.height = backingH
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

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
    ctx.font = '11px "IBM Plex Sans", "Segoe UI", sans-serif'
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
      return
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
  }

  // Draw after the element is laid out (so clientWidth is known), then keep it crisp as
  // the container resizes. Falls back to an immediate draw where these APIs are absent.
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(draw)
  } else {
    draw()
  }
  if (typeof ResizeObserver === 'function') {
    let lastWidth = -1
    const observer = new ResizeObserver(() => {
      const width = canvas.clientWidth
      // Only redraw on an actual width change to avoid feedback from our own resizing.
      if (width > 0 && width !== lastWidth) {
        lastWidth = width
        draw()
      }
    })
    observer.observe(canvas)
  }

  return canvas
}
