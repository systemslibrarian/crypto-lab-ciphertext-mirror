import type { ScholarMeta } from './types'

export function renderScholarBadge(meta: ScholarMeta): HTMLElement {
  const a = document.createElement('a')
  a.className = 'scholar-badge'
  a.href = meta.url
  a.target = '_blank'
  a.rel = 'noreferrer'
  a.title = meta.title
  a.innerHTML = `<span class="paper-pill">${meta.year}/${meta.eprintId}</span><span>${meta.authorLine}</span>`
  return a
}
