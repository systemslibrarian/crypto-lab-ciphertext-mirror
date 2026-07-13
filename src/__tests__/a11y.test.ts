/**
 * @vitest-environment jsdom
 *
 * Automated accessibility regression guard. Renders the real landing page and each card
 * into a JSDOM document and runs axe-core against it. JSDOM has no layout/painting, so
 * rules that need geometry or computed color (color-contrast, target-size) cannot be
 * evaluated here — those are verified numerically/structurally elsewhere. This test locks
 * in the *structural* ADA work: landmarks, roles, names, labels, heading order, alt text.
 */
import axe from 'axe-core'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { renderCardGrid } from '../components/CardGrid'
import { renderConceptPrimer } from '../components/ConceptPrimer'
import { renderDecapPrimer } from '../components/DecapPrimer'
import { renderMaskingMechanismStrip } from '../components/MaskingMechanismStrip'
import { renderTannerGraph } from '../components/TannerGraph'
import { renderImperfectDfOracleCard } from '../cards/card-imperfect-df-oracle'
import { renderMaskedComparisonCard } from '../cards/card-masked-comparison'
import { sampleMaskingMechanism } from '../cards/card-masked-comparison/sim'
import { renderRnrBlindingCard } from '../cards/card-rnr-blinding'

async function violationsFor(root: HTMLElement): Promise<string[]> {
  const results = await axe.run(root, {
    // Assert genuine WCAG 2.0/2.1 A & AA conformance (the ADA standard). Best-practice-only
    // rules (e.g. "region", "landmark-one-main") are excluded — several are JSDOM artifacts
    // here (the shared topbar banner lives in index.html, not this harness; the skip link is
    // off-screen via CSS that JSDOM doesn't apply).
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    // JSDOM has no painting, so color contrast can't be computed; it's verified numerically.
    rules: { 'color-contrast': { enabled: false } },
  })
  return results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s) — ${v.help}`)
}

/** Build the real page skeleton (skip link + header banner-substitute + <main>). */
function mountPage(): HTMLElement {
  document.documentElement.lang = 'en'
  document.title = 'Crypto Lab - Ciphertext Mirror'
  document.body.innerHTML = ''

  const skip = document.createElement('a')
  skip.className = 'skip-link'
  skip.href = '#app'
  skip.textContent = 'Skip to main content'

  const main = document.createElement('main')
  main.id = 'app'

  document.body.append(skip, main)
  return main
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('accessibility (axe-core, structural)', () => {
  beforeEach(() => {
    mountPage()
  })

  test('landing page (header + concept primer + paper grid) has no structural violations', async () => {
    const main = document.getElementById('app') as HTMLElement
    const section = document.createElement('section')
    const h2 = document.createElement('h2')
    h2.textContent = 'Choose a paper replay'
    section.append(
      h2,
      renderCardGrid(() => {}),
    )
    main.append(renderDecapPrimer(), renderConceptPrimer(), section)

    expect(await violationsFor(document.body)).toEqual([])
  })

  test('teaching mechanisms (Tanner graph + mechanism strip) have no structural violations', async () => {
    const main = document.getElementById('app') as HTMLElement
    const h2 = document.createElement('h2')
    h2.textContent = 'Mechanisms'
    main.append(h2, renderTannerGraph())
    const sample = await sampleMaskingMechanism(512, 'a11y-mech', 0.8, 0, 2)
    main.append(renderMaskingMechanismStrip(sample))

    expect(await violationsFor(document.body)).toEqual([])
  })

  test.each([
    ['masked comparison', renderMaskedComparisonCard],
    ['imperfect DF-oracle', renderImperfectDfOracleCard],
    ['RNR blinding', renderRnrBlindingCard],
  ])('%s replay has no structural violations', async (_name, render) => {
    const main = document.getElementById('app') as HTMLElement
    main.append(render())

    expect(await violationsFor(document.body)).toEqual([])
  })
})
