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
      </div>
    </div>
    <button class="cl-theme-toggle" type="button" style="position: absolute; top: 0; right: 0" aria-label="Switch theme"></button>
  `

  return header
}
