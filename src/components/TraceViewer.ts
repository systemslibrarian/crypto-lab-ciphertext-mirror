export function renderTraceViewer(points: number[], color = 'var(--mirror-glow)'): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.className = 'trace-canvas'
  canvas.width = 720
  canvas.height = 200

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return canvas
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.strokeStyle = 'color-mix(in oklab, var(--border-color) 50%, transparent)'
  ctx.beginPath()
  ctx.moveTo(0, canvas.height / 2)
  ctx.lineTo(canvas.width, canvas.height / 2)
  ctx.stroke()

  if (points.length < 2) {
    return canvas
  }

  const maxAbs = Math.max(...points.map((p) => Math.abs(p)), 1e-6)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  points.forEach((point, index) => {
    const x = (index / (points.length - 1)) * canvas.width
    const y = canvas.height / 2 - (point / maxAbs) * (canvas.height * 0.42)
    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.stroke()

  return canvas
}
