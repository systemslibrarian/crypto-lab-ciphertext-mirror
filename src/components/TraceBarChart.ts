export type BarRow = {
  label: string
  value: number
  /** Optional caption shown to the right of the value (e.g. tier name). */
  caption?: string
  /** Highlight this row (e.g. best/worst). */
  highlight?: boolean
}

export type ReferenceMarker = {
  at: number
  label: string
}

export type TraceBarChartOptions = {
  rows: BarRow[]
  /** Maximum value used to scale the bars. Defaults to the largest row value. */
  max?: number
  /** Reference vertical lines (e.g. tier thresholds). */
  references?: ReferenceMarker[]
  /** Y-axis caption shown above the chart. */
  unitLabel?: string
}

function compactNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '—'
  }
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`
  }
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`
  }
  return Math.round(value).toLocaleString()
}

export function renderTraceBarChart(opts: TraceBarChartOptions): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'bar-chart'

  if (opts.unitLabel) {
    const cap = document.createElement('p')
    cap.className = 'bar-chart-unit'
    cap.textContent = opts.unitLabel
    wrap.append(cap)
  }

  const max = Math.max(
    opts.max ?? 0,
    ...opts.rows.map((r) => r.value),
    ...(opts.references ?? []).map((r) => r.at),
    1,
  )

  const grid = document.createElement('div')
  grid.className = 'bar-chart-grid'

  opts.rows.forEach((row) => {
    const item = document.createElement('div')
    item.className = `bar-chart-row${row.highlight ? ' is-highlight' : ''}`

    const label = document.createElement('span')
    label.className = 'bar-chart-label'
    label.textContent = row.label

    const track = document.createElement('div')
    track.className = 'bar-chart-track'

    const fill = document.createElement('div')
    fill.className = 'bar-chart-fill'
    const pct = max > 0 ? Math.max(2, Math.min(100, (row.value / max) * 100)) : 0
    fill.style.width = `${pct}%`
    track.append(fill)

    if (opts.references) {
      opts.references.forEach((ref) => {
        const tick = document.createElement('span')
        tick.className = 'bar-chart-ref'
        const refPct = Math.max(0, Math.min(100, (ref.at / max) * 100))
        tick.style.left = `${refPct}%`
        tick.title = `${ref.label}: ${compactNumber(ref.at)}`
        track.append(tick)
      })
    }

    const value = document.createElement('span')
    value.className = 'bar-chart-value'
    const main = document.createElement('strong')
    main.textContent = compactNumber(row.value)
    value.append(main)
    if (row.caption) {
      const cap = document.createElement('span')
      cap.className = 'bar-chart-caption'
      cap.textContent = row.caption
      value.append(cap)
    }

    item.append(label, track, value)
    grid.append(item)
  })

  wrap.append(grid)

  if (opts.references && opts.references.length > 0) {
    const legend = document.createElement('ul')
    legend.className = 'bar-chart-legend'
    opts.references.forEach((ref) => {
      const li = document.createElement('li')
      li.innerHTML = `<span class="bar-chart-legend-tick" aria-hidden="true"></span><span><strong>${compactNumber(ref.at)}</strong> &mdash; ${ref.label}</span>`
      legend.append(li)
    })
    wrap.append(legend)
  }

  return wrap
}
