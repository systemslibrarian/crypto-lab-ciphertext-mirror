const THEME_COOKIE = 'cl-theme'

type Theme = 'light' | 'dark'

function setTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; SameSite=Lax`
}

function currentTheme(): Theme {
  const v = document.documentElement.getAttribute('data-theme')
  return v === 'dark' ? 'dark' : 'light'
}

function themeIcon(theme: Theme): string {
  return theme === 'dark'
    ? '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21 12.79A9 9 0 1 1 11.21 3a1 1 0 0 1 1.11 1.46A7 7 0 1 0 19.54 11.7A1 1 0 0 1 21 12.79Z"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.76 4.84 5.35 3.43 3.93 4.84l1.41 1.41 1.42-1.41ZM1 13h3v-2H1v2Zm10 10h2v-3h-2v3Zm9.07-18.16-1.41-1.41-1.42 1.41 1.41 1.41 1.42-1.41ZM17.24 19.16l1.41 1.41 1.42-1.41-1.41-1.41-1.42 1.41ZM20 13h3v-2h-3v2ZM11 1v3h2V1h-2Zm-7.07 18.16 1.41 1.41 1.42-1.41-1.41-1.41-1.42 1.41ZM12 6a6 6 0 1 0 0 12a6 6 0 0 0 0-12Z"/></svg>'
}

export function renderHeader(): HTMLElement {
  const header = document.createElement('header')
  header.className = 'cl-header'
  header.innerHTML = `
    <div class="cl-header-inner">
      <div class="cl-brand">
        <div class="cl-badge" aria-label="Crypto Lab">CL</div>
        <div>
          <p class="cl-title">CRYPTO LAB</p>
          <p class="cl-subtitle">Ciphertext Mirror</p>
        </div>
      </div>
      <div class="cl-actions">
        <a class="cl-link-btn" href="https://systemslibrarian.dev" target="_blank" rel="noreferrer">systemslibrarian.dev</a>
        <a class="cl-link-btn" href="https://github.com/systemslibrarian/crypto-lab-ciphertext-mirror" target="_blank" rel="noreferrer">GitHub</a>
        <button class="cl-theme-toggle" type="button" aria-label="Toggle theme"></button>
      </div>
    </div>
  `

  const toggle = header.querySelector<HTMLButtonElement>('.cl-theme-toggle')
  if (toggle) {
    const update = (): void => {
      toggle.innerHTML = themeIcon(currentTheme())
    }
    update()
    toggle.addEventListener('click', () => {
      const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark'
      setTheme(next)
      update()
    })
  }

  return header
}
