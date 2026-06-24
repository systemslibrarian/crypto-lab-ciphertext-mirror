export function renderHeader(): HTMLElement {
  // role="group" (not the implicit banner) so the page keeps a single banner landmark:
  // the shared Crypto Lab topbar in index.html. This in-page header carries the page's
  // own <h1> (the demo's subject), which the topbar does not provide.
  const header = document.createElement('header')
  header.className = 'cl-header'
  header.setAttribute('role', 'group')
  header.setAttribute('aria-label', 'Ciphertext Mirror')
  header.innerHTML = `
    <div class="cl-header-inner">
      <div class="cl-brand">
        <div class="cl-badge" aria-hidden="true">CL</div>
        <div>
          <p class="cl-eyebrow">CRYPTO LAB</p>
          <h1 class="cl-title">Ciphertext Mirror</h1>
        </div>
      </div>
      <div class="cl-actions">
        <a class="cl-link-btn" href="https://systemslibrarian.dev" target="_blank" rel="noreferrer">systemslibrarian.dev</a>
        <a class="cl-link-btn" href="https://github.com/systemslibrarian/crypto-lab-ciphertext-mirror" target="_blank" rel="noreferrer">GitHub</a>
      </div>
    </div>
  `

  return header
}
