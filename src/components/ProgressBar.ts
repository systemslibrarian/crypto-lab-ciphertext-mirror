export function renderProgressBar(value: number, max: number): HTMLElement {
  const wrap = document.createElement('div')
  const ratio = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max))
  wrap.setAttribute('role', 'progressbar')
  wrap.setAttribute('aria-valuemin', '0')
  wrap.setAttribute('aria-valuemax', String(max))
  wrap.setAttribute('aria-valuenow', String(value))
  wrap.setAttribute('aria-label', `Replay progress: step ${value} of ${max}`)
  wrap.innerHTML = `
    <div style="height:10px;border:1px solid var(--border-color);border-radius:999px;overflow:hidden;background:var(--surface-alt)">
      <div style="height:100%;width:${(ratio * 100).toFixed(1)}%;background:var(--accent)"></div>
    </div>
  `
  return wrap
}
