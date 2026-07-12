/**
 * Fleet-standard page hero: a title block on the left (big name, spec subtitle,
 * one-sentence description) and a "why it matters" box on the right. Structure,
 * sizing, and layout are kept identical across every crypto-lab demo; only the
 * text and the theme-variable mapping in the managed CSS block differ per repo.
 */
export function renderHero(): HTMLElement {
  const header = document.createElement('header')
  header.className = 'cl-hero'
  header.innerHTML = `
    <div class="cl-hero-main">
      <h1 class="cl-hero-title">Ciphertext Mirror</h1>
      <p class="cl-hero-sub">ML-KEM side channels · FIPS 203 · FO transform</p>
      <p class="cl-hero-desc">Run three published attacks and defenses against ML-KEM decapsulation's Fujisaki–Okamoto re-encryption "mirror," tuning masking order, oracle noise, and blinding to watch each result behave.</p>
    </div>
    <aside class="cl-hero-why" aria-label="Why it matters">
      <span class="cl-hero-why-label">WHY IT MATTERS</span>
      <p class="cl-hero-why-text">ML-KEM is the NIST post-quantum standard now shipping in TLS and messaging. Its math is quantum-safe, but a real device can still leak the private key through power, timing, or fault behavior — so implementations must defend the mirror, not just trust it.</p>
    </aside>
  `
  return header
}
