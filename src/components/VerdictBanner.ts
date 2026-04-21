export type VerdictTone = 'good' | 'warn' | 'bad' | 'floor' | 'neutral'

export type VerdictMetric = {
  label: string
  value: string
}

export type VerdictBannerOptions = {
  tone: VerdictTone
  headline: string
  detail: string
  metrics?: VerdictMetric[]
  nextStep?: string
}

const ICONS: Record<VerdictTone, string> = {
  good: '✓',
  warn: '!',
  bad: '✕',
  floor: '∅',
  neutral: '·',
}

const LABELS: Record<VerdictTone, string> = {
  good: 'Defense holding',
  warn: 'Mixed signal',
  bad: 'Leakage detected',
  floor: 'No usable signal',
  neutral: 'Replay complete',
}

export function renderVerdictBanner(opts: VerdictBannerOptions): HTMLElement {
  const wrap = document.createElement('section')
  wrap.className = `verdict-banner verdict-${opts.tone}`
  wrap.setAttribute('role', 'status')

  const head = document.createElement('div')
  head.className = 'verdict-head'

  const icon = document.createElement('span')
  icon.className = 'verdict-icon'
  icon.setAttribute('aria-hidden', 'true')
  icon.textContent = ICONS[opts.tone]

  const titleBlock = document.createElement('div')
  titleBlock.className = 'verdict-title-block'
  const label = document.createElement('p')
  label.className = 'verdict-label'
  label.textContent = LABELS[opts.tone]
  const headline = document.createElement('h3')
  headline.className = 'verdict-headline'
  headline.textContent = opts.headline
  titleBlock.append(label, headline)

  head.append(icon, titleBlock)
  wrap.append(head)

  const detail = document.createElement('p')
  detail.className = 'verdict-detail'
  detail.textContent = opts.detail
  wrap.append(detail)

  if (opts.metrics && opts.metrics.length > 0) {
    const grid = document.createElement('dl')
    grid.className = 'verdict-metrics'
    opts.metrics.forEach((m) => {
      const dt = document.createElement('dt')
      dt.textContent = m.label
      const dd = document.createElement('dd')
      dd.textContent = m.value
      grid.append(dt, dd)
    })
    wrap.append(grid)
  }

  if (opts.nextStep) {
    const next = document.createElement('p')
    next.className = 'verdict-next'
    const tag = document.createElement('strong')
    tag.textContent = 'Try next: '
    next.append(tag, document.createTextNode(opts.nextStep))
    wrap.append(next)
  }

  return wrap
}
