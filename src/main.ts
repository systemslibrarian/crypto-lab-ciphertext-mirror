import { renderCardGrid } from './components/CardGrid'
import { renderHeader } from './components/Header'
import { renderMaskedComparisonCard } from './cards/card-masked-comparison'
import { renderImperfectDfOracleCard } from './cards/card-imperfect-df-oracle'
import { renderRnrBlindingCard } from './cards/card-rnr-blinding'
import './styles/cards.css'
import './styles/header.css'
import './styles/layout.css'
import './styles/theme.css'

type CardSlug = 'masked-comparison' | 'imperfect-df-oracle' | 'rnr-blinding'

type ReplayContext = {
  title: string
  citation: string
  context: string
  summary: string
}

const replayContextByCard: Record<CardSlug, ReplayContext> = {
  'masked-comparison': {
    title: 'Masked Comparison Leakage Replay',
    citation: 'Hermelink et al., ePrint 2024/060',
    context: 'FO mirror comparison leakage under masking order escalation.',
    summary: 'This replay demonstrates correlation trends and trace-effort shifts as masking order and noise settings vary.',
  },
  'imperfect-df-oracle': {
    title: 'Imperfect DF-Oracle Replay',
    citation: 'Guo, Nabokov, Johansson, ePrint 2026/070',
    context: 'Noisy and partial decryption-failure feedback can still accumulate useful signal.',
    summary: 'This replay demonstrates recovery trend and confidence behavior as oracle error and availability change.',
  },
  'rnr-blinding': {
    title: 'NTT + CRT RNR Blinding Replay',
    citation: 'Duparc, Taha, ePrint 2025/181',
    context: 'Matched A/B replay compares unblinded and blinded behavior with optional fault injection.',
    summary: 'This replay demonstrates directional defense impact in synthetic leakage and branch-state outcomes.',
  },
}

const root = document.querySelector<HTMLDivElement>('#root')

if (!root) {
  throw new Error('Root mount element not found')
}

const page = document.createElement('div')
page.className = 'page'

const header = renderHeader()
const main = document.createElement('main')
main.id = 'app'

page.append(header, main)
root.append(page)

function setupThemeToggle(): void {
  const toggle = header.querySelector<HTMLButtonElement>('.cl-theme-toggle')
  if (!toggle) {
    return
  }

  const safeSetTheme = (theme: 'light' | 'dark'): void => {
    try {
      localStorage.setItem('theme', theme)
    } catch (_err) {
      // Ignore storage write failures in restricted browsing contexts.
    }
  }

  const sync = (): void => {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
    toggle.textContent = isDark ? '🌙' : '☀️'
    toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode')
  }

  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
    const next = current === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    safeSetTheme(next)
    sync()
  })

  sync()
}

function currentCard(): CardSlug | null {
  const params = new URLSearchParams(window.location.search)
  const card = params.get('card')
  if (card === 'masked-comparison' || card === 'imperfect-df-oracle' || card === 'rnr-blinding') {
    return card
  }
  return null
}

function setCard(card: CardSlug | null, scrollToReplay = false): void {
  const url = new URL(window.location.href)
  if (card) {
    url.searchParams.set('card', card)
  } else {
    url.searchParams.delete('card')
  }
  window.history.pushState({}, '', url)
  render(scrollToReplay)
}

function render(scrollToReplay = false): void {
  main.innerHTML = ''
  const selectedCard = currentCard()

  const landing = document.createElement('section')
  landing.className = 'landing-shell'
  const landingTitle = document.createElement('h2')
  landingTitle.className = 'landing-title'
  landingTitle.textContent = 'Choose a paper replay'
  const landingHint = document.createElement('p')
  landingHint.className = 'landing-hint'
  landingHint.textContent = 'Select any card to open the replay workspace below. The selected paper stays highlighted while you run simulations.'

  landing.append(
    landingTitle,
    landingHint,
    renderCardGrid(
      (slug) => {
        setCard(slug, true)
      },
      selectedCard,
    ),
  )
  main.append(landing)

  if (!selectedCard) {
    return
  }

  const replayContext = replayContextByCard[selectedCard]

  const replaySection = document.createElement('section')
  replaySection.id = 'replay-lab'
  replaySection.className = 'replay-lab'

  const replayHeader = document.createElement('div')
  replayHeader.className = 'replay-header'

  const replayTitleBlock = document.createElement('div')
  replayTitleBlock.className = 'replay-title-block'
  replayTitleBlock.innerHTML = `
    <p class="replay-kicker">Replay context: selected paper</p>
    <h2>${replayContext.title}</h2>
    <p class="replay-citation">${replayContext.citation}</p>
    <p>${replayContext.context}</p>
    <p>${replayContext.summary}</p>
  `

  const back = document.createElement('button')
  back.type = 'button'
  back.className = 'open-btn replay-close-btn'
  back.textContent = 'Close replay'
  back.addEventListener('click', () => {
    setCard(null)
  })
  replayHeader.append(replayTitleBlock, back)
  replaySection.append(replayHeader)

  if (selectedCard === 'masked-comparison') {
    replaySection.append(renderMaskedComparisonCard())
  }
  if (selectedCard === 'imperfect-df-oracle') {
    replaySection.append(renderImperfectDfOracleCard())
  }
  if (selectedCard === 'rnr-blinding') {
    replaySection.append(renderRnrBlindingCard())
  }

  main.append(replaySection)
  if (scrollToReplay) {
    replaySection.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

window.addEventListener('popstate', () => {
  render(false)
})
setupThemeToggle()
render()
