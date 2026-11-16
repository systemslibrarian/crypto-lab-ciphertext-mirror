import { describe, expect, test } from 'vitest'
import { rnrBlindingReality } from '../reality'
import { maskedComparisonReality } from '../../card-masked-comparison/reality'
import { imperfectDfReality } from '../../card-imperfect-df-oracle/reality'

/**
 * ePrint 2025/181 has five authors — Mounir Taha, Julien Cam, Max Duparc,
 * Hervé Pelletier and Karine Villegas — and the Reality Panel used to credit
 * two of them, "Duparc and Taha", while the card's own scholar line already
 * listed all five. It also said they "introduce" the scheme. They do not: §1.5
 * says "we improve the blinding mechanisms introduced in [32] and [12]" — the
 * NTT blinding of Ravi et al. and the CRT-based RNR blinding of Heinz and
 * Pöppelmann — and the abstract's verbs are "revisit and enhance".
 *
 * Attribution is the one claim on this page that cannot be re-derived from a
 * run, so it is pinned here.
 */
describe('RNR blinding attribution', () => {
  test('the paper line credits the full author list, not two of five', () => {
    expect(rnrBlindingReality.paper).toContain('Taha, Cam, Duparc, Pelletier, Villegas')
    expect(rnrBlindingReality.paper).toContain('(2025/181)')
    expect(rnrBlindingReality.paper).not.toContain('Duparc and Taha')
  })

  test('the paper improves two existing countermeasures and names them', () => {
    const shows = rnrBlindingReality.whatPaperShows
    expect(shows).toMatch(/revisit and enhance two existing blinding countermeasures/)
    expect(shows).toContain('Ravi et al.')
    expect(shows).toContain('Heinz and Pöppelmann')
    // "introduce an ... RNR blinding scheme" was the claim the paper contradicts.
    expect(shows).not.toMatch(/introduce an?\b/)
  })

  test('every card still attributes its paper and none drops the eprint id', () => {
    for (const reality of [maskedComparisonReality, imperfectDfReality, rnrBlindingReality]) {
      expect(reality.paper).toMatch(/\(20\d\d\/\d{3}\)/)
    }
  })
})
