/**
 * "What is ML-KEM decapsulation?" primer.
 *
 * All three replays attack (or defend) one specific step of the ML-KEM decapsulation
 * flow: the Fujisaki–Okamoto re-encryption comparison — the "mirror". A crypto newcomer
 * has no picture of the *normal* flow those attacks perturb. This renders that flow once,
 * as a labeled pipeline (ciphertext → decrypt → re-encrypt → compare → accept/reject),
 * and marks exactly where each card's attack/defense strikes, so the black box is opened
 * at least at diagram level before the attack cards. Links the sibling kyber-vault demo
 * for the full, honest decapsulation implementation.
 */

type Stage = {
  key: string
  label: string
  detail: string
}

const STAGES: Stage[] = [
  {
    key: 'ct',
    label: 'Ciphertext c',
    detail:
      'The public message the sender produced with your public key. It may be honest — or maliciously chosen by an attacker.',
  },
  {
    key: 'decrypt',
    label: 'Decrypt with secret key',
    detail:
      'Use the private key to recover a candidate message m′ from c. On its own this K-PKE decryption is malleable, so it is never trusted directly.',
  },
  {
    key: 'reencrypt',
    label: 'Re-encrypt m′ → c′',
    detail:
      'Deterministically re-run encryption on the recovered m′ to rebuild what the ciphertext *should* have been if m′ were genuine.',
  },
  {
    key: 'compare',
    label: 'Compare c′ =? c  (the mirror)',
    detail:
      'Hold the rebuilt c′ up against the received c. This equality check is the Fujisaki–Okamoto "mirror". It touches secret-derived values, so how it is computed can leak.',
  },
  {
    key: 'branch',
    label: 'Accept K  /  Reject → K̄',
    detail:
      'If the mirror matches, output the real shared secret K. If not, output a pseudo-random reject value K̄ (implicit rejection) so failures reveal nothing by design.',
  },
]

type Marker = {
  stageKey: string
  tone: 'attack' | 'defense'
  card: string
  note: string
}

const MARKERS: Marker[] = [
  {
    stageKey: 'compare',
    tone: 'attack',
    card: 'Card 1 — Masked Comparison',
    note: 'attacks the mirror comparison: even when it is masked, share leakage can be recombined.',
  },
  {
    stageKey: 'branch',
    tone: 'attack',
    card: 'Card 2 — Imperfect DF-Oracle',
    note: 'attacks the accept/reject branch: a noisy, intermittent failure signal still leaks the key.',
  },
  {
    stageKey: 'reencrypt',
    tone: 'defense',
    card: 'Card 3 — RNR Blinding',
    note: 'defends the arithmetic feeding the mirror: randomizing the NTT/CRT decorrelates leakage and catches faults.',
  },
]

export function renderDecapPrimer(): HTMLElement {
  const details = document.createElement('details')
  details.className = 'decap-primer'
  details.open = true

  const summary = document.createElement('summary')
  summary.innerHTML =
    '<span class="decap-primer-badge">Start here</span> What is ML-KEM decapsulation? — the normal flow all three cards perturb'
  details.append(summary)

  const body = document.createElement('div')
  body.className = 'decap-primer-body'

  const intro = document.createElement('p')
  intro.className = 'decap-primer-intro'
  intro.innerHTML =
    'Decapsulation is how the receiver turns a ciphertext back into the shared secret. ML-KEM never trusts a raw decryption: it <strong>re-encrypts and compares</strong> (the Fujisaki–Okamoto "mirror") before accepting. Every card below attacks or defends one step of this exact pipeline — the highlighted stage tells you which.'
  body.append(intro)

  // Pipeline: labeled boxes joined by arrows. role=list so the ordered flow is
  // announced as a sequence; each stage is a listitem with its plain-language detail.
  const pipe = document.createElement('ol')
  pipe.className = 'decap-pipeline'
  pipe.setAttribute('aria-label', 'ML-KEM decapsulation pipeline, in order')

  STAGES.forEach((stage, i) => {
    const marker = MARKERS.find((m) => m.stageKey === stage.key)
    const li = document.createElement('li')
    li.className = 'decap-stage'
    if (marker) li.classList.add(marker.tone === 'attack' ? 'decap-stage-attack' : 'decap-stage-defense')

    const box = document.createElement('div')
    box.className = 'decap-stage-box'

    const num = document.createElement('span')
    num.className = 'decap-stage-num'
    num.textContent = String(i + 1)
    num.setAttribute('aria-hidden', 'true')

    const label = document.createElement('p')
    label.className = 'decap-stage-label'
    label.textContent = stage.label

    const detail = document.createElement('p')
    detail.className = 'decap-stage-detail'
    detail.textContent = stage.detail

    box.append(num, label, detail)

    if (marker) {
      const tag = document.createElement('p')
      tag.className = `decap-stage-tag decap-tag-${marker.tone}`
      // Text prefix, not color alone (WCAG 1.4.1): "Attacked here" / "Defended here".
      const kind = document.createElement('strong')
      kind.textContent = marker.tone === 'attack' ? 'Attacked here — ' : 'Defended here — '
      tag.append(kind, document.createTextNode(`${marker.card} ${marker.note}`))
      box.append(tag)
    }

    li.append(box)

    if (i < STAGES.length - 1) {
      const arrow = document.createElement('span')
      arrow.className = 'decap-arrow'
      arrow.setAttribute('aria-hidden', 'true')
      arrow.textContent = '→'
      li.append(arrow)
    }
    pipe.append(li)
  })

  body.append(pipe)

  const foot = document.createElement('p')
  foot.className = 'decap-primer-foot'
  foot.innerHTML =
    'Want the full, honest decapsulation implementation (key generation, encapsulation, and this exact mirror) end to end? See the sibling demo <a href="https://systemslibrarian.github.io/crypto-lab-kyber-vault/">kyber-vault</a>. This lab reuses the same NIST-KAT-validated FIPS 203 core.'
  body.append(foot)

  details.append(body)
  return details
}
