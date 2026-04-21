import { renderScholarBadge } from './ScholarBadge'
import type { MirrorState, ScholarMeta } from './types'
import { renderMirror } from '../lib/viz/mirror'

type CardSlug = 'masked-comparison' | 'imperfect-df-oracle' | 'rnr-blinding'

type CardInfo = {
  slug: CardSlug
  title: string
  hook: string
  mirror: MirrorState
  scholar: ScholarMeta
}

const cards: CardInfo[] = [
  {
    slug: 'masked-comparison',
    title: 'Masked Comparison Leakage',
    hook: 'Higher-order masking of the FO comparison still leaks.',
    mirror: 'cracked',
    scholar: {
      title: "The Insecurity of Masked Comparisons: SCAs on ML-KEM's FO-Transform",
      year: 2024,
      eprintId: '060',
      authorLine: 'Hermelink et al.',
      url: 'https://eprint.iacr.org/2024/060',
    },
  },
  {
    slug: 'imperfect-df-oracle',
    title: 'Imperfect DF-Oracle',
    hook: 'Even a noisy, imperfect oracle is enough.',
    mirror: 'clouded',
    scholar: {
      title: 'Unlocking the True Potential of Decryption Failure Oracles: A Hybrid Adaptive-LDPC Attack on ML-KEM Using Imperfect Oracles',
      year: 2026,
      eprintId: '070',
      authorLine: 'Guo, Nabokov, Johansson',
      url: 'https://eprint.iacr.org/2026/070',
    },
  },
  {
    slug: 'rnr-blinding',
    title: 'NTT + CRT RNR Blinding',
    hook: 'NTT + CRT blinding holds under SCA and fault.',
    mirror: 'hardened',
    scholar: {
      title: 'Improved NTT and CRT-based RNR Blinding for Side-Channel and Fault Resistant Kyber',
      year: 2025,
      eprintId: '181',
      authorLine: 'Duparc, Taha',
      url: 'https://eprint.iacr.org/2025/181',
    },
  },
]

export function renderCardGrid(onOpen: (slug: CardSlug) => void): HTMLElement {
  const section = document.createElement('section')
  section.className = 'card-grid'

  cards.forEach((card) => {
    const article = document.createElement('article')
    article.className = 'paper-card'

    const mirror = renderMirror(card.mirror)
    const badge = renderScholarBadge(card.scholar)
    const title = document.createElement('h2')
    title.textContent = card.title
    const hook = document.createElement('p')
    hook.textContent = card.hook
    const button = document.createElement('button')
    button.className = 'open-btn'
    button.type = 'button'
    button.textContent = 'Open replay'
    button.addEventListener('click', () => onOpen(card.slug))

    article.append(title, hook, mirror, badge, button)
    section.append(article)
  })

  return section
}
