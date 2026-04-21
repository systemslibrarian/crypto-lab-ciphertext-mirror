import { renderCardGrid } from './components/CardGrid'
import { renderFooter } from './components/Footer'
import { renderHeader } from './components/Header'
import { renderMaskedComparisonCard } from './cards/card-masked-comparison'
import { renderImperfectDfOracleCard } from './cards/card-imperfect-df-oracle'
import { renderRnrBlindingCard } from './cards/card-rnr-blinding'
import './styles/cards.css'
import './styles/header.css'
import './styles/layout.css'
import './styles/theme.css'

type CardSlug = 'masked-comparison' | 'imperfect-df-oracle' | 'rnr-blinding'

const root = document.querySelector<HTMLDivElement>('#root')

if (!root) {
  throw new Error('Root mount element not found')
}

const page = document.createElement('div')
page.className = 'page'

const header = renderHeader()
const main = document.createElement('main')
main.id = 'app'
const footer = renderFooter()

page.append(header, main, footer)
root.append(page)

function setupThemeToggle(): void {
  const toggle = header.querySelector<HTMLButtonElement>('.cl-theme-toggle')
  if (!toggle) {
    return
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
    localStorage.setItem('theme', next)
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

function setCard(card: CardSlug | null): void {
  const url = new URL(window.location.href)
  if (card) {
    url.searchParams.set('card', card)
  } else {
    url.searchParams.delete('card')
  }
  window.history.pushState({}, '', url)
  render()
}

function render(): void {
  main.innerHTML = ''
  const card = currentCard()
  if (!card) {
    main.append(
      renderCardGrid((slug) => {
        setCard(slug)
      }),
    )
    return
  }

  const back = document.createElement('button')
  back.type = 'button'
  back.className = 'open-btn'
  back.textContent = 'Back to papers'
  back.addEventListener('click', () => {
    setCard(null)
  })
  main.append(back)

  if (card === 'masked-comparison') {
    main.append(renderMaskedComparisonCard())
  }
  if (card === 'imperfect-df-oracle') {
    main.append(renderImperfectDfOracleCard())
  }
  if (card === 'rnr-blinding') {
    main.append(renderRnrBlindingCard())
  }
}

window.addEventListener('popstate', render)
setupThemeToggle()
render()
