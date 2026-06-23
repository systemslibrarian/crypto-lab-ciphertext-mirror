type GlossaryEntry = { term: string; definition: string }

const GLOSSARY: GlossaryEntry[] = [
  {
    term: 'ML-KEM (Kyber)',
    definition:
      'The NIST post-quantum key-encapsulation standard (FIPS 203). Two parties agree on a shared secret that a quantum computer cannot recover from the public traffic.',
  },
  {
    term: 'Encapsulation / Decapsulation',
    definition:
      'Encapsulation uses the public key to produce a ciphertext and a shared secret; decapsulation uses the private key to recover that shared secret from the ciphertext.',
  },
  {
    term: 'FO transform',
    definition:
      'Fujisaki–Okamoto. After decrypting, the receiver re-encrypts and checks the result matches the ciphertext. This "mirror" rejects malformed ciphertexts — but the comparison itself can leak.',
  },
  {
    term: 'Side channel',
    definition:
      'Information that leaks through physical behavior — power draw, timing, electromagnetic emissions — rather than through the math. Side-channel attacks read secrets from how a device computes, not what it outputs.',
  },
  {
    term: 'CPA (correlation power analysis)',
    definition:
      'An attack that correlates measured leakage against a predicted value for each key guess. The correct guess shows the strongest correlation.',
  },
  {
    term: 'Masking',
    definition:
      'A defense that splits each secret value into d+1 random "shares" whose combination equals the secret. An attacker must combine the leakage of all shares at once, which noise makes exponentially harder.',
  },
  {
    term: 'Masking order (d)',
    definition:
      'The number of extra random shares. Higher order = more shares to combine = more traces needed — but only if there is enough noise.',
  },
  {
    term: 'Noise (σ)',
    definition:
      'The standard deviation of measurement noise on each leakage sample. More noise means the attacker needs more traces to average it away.',
  },
  {
    term: 'Decryption-failure (DF) oracle',
    definition:
      'Any signal that reveals whether a chosen ciphertext decrypted successfully. Repeated queries leak the secret key, even when the signal is noisy or only sometimes available.',
  },
  {
    term: 'RNR blinding',
    definition:
      'Randomize-and-Re-randomize. A defense that adds a fresh random mask to intermediate values (in the NTT/CRT arithmetic) so leakage no longer correlates with the secret, and adds a check that catches injected faults.',
  },
  {
    term: 'NTT / CRT',
    definition:
      'Number-Theoretic Transform and Chinese Remainder Theorem — the fast arithmetic ML-KEM uses for polynomial multiplication, and where RNR blinding inserts its randomness.',
  },
]

export function renderConceptPrimer(): HTMLElement {
  const details = document.createElement('details')
  details.className = 'concept-primer'

  const summary = document.createElement('summary')
  summary.innerHTML =
    '<span class="concept-primer-badge">New here?</span> Start with the concepts — what these three replays are attacking and defending'
  details.append(summary)

  const body = document.createElement('div')
  body.className = 'concept-primer-body'
  body.innerHTML = `
    <h3>The big picture</h3>
    <p>ML-KEM is the post-quantum standard two computers use to agree on a shared secret. The math is believed safe even against quantum computers. But a <em>physical device</em> running that math can still leak the secret through the way it computes — a <strong>side channel</strong>. These three replays each take a published research result and let you watch the attack or defense behave as you change its conditions.</p>

    <h3>The "mirror" at the center</h3>
    <p>To stay secure against malformed ciphertexts, ML-KEM decryption uses the <strong>FO transform</strong>: after decrypting, it <em>re-encrypts</em> and compares the result to what it received — a mirror held up to the ciphertext. If they don't match, it rejects. That comparison is essential, but it touches the secret, so <em>how</em> it is computed can leak. That mirror is the thread connecting all three papers.</p>

    <h3>Two attacks, one defense</h3>
    <ul>
      <li><strong>Card 1 — Masked Comparison (attack):</strong> even when the mirror comparison is masked, the leakage can still be combined across shares. You'll see that masking only helps when paired with enough noise.</li>
      <li><strong>Card 2 — Imperfect DF-Oracle (attack):</strong> a noisy, only-sometimes-available failure signal still accumulates into full key recovery given enough queries.</li>
      <li><strong>Card 3 — RNR Blinding (defense):</strong> randomizing the arithmetic decorrelates the leakage entirely and catches injected faults — the mirror without the leak.</li>
    </ul>

    <h3>How to read each replay</h3>
    <p>Set the parameters, run it, and read the colored <strong>verdict banner</strong> first — it states the outcome in one line and suggests what to try next. The chart shows the trend; the <strong>Interpretation</strong> and <strong>Reality &amp; limitations</strong> panels tell you exactly what the numbers do and do not mean. Every run is seeded, so the same inputs always reproduce the same result.</p>

    <h3>Glossary</h3>
    <dl class="concept-glossary">
      ${GLOSSARY.map((g) => `<dt>${g.term}</dt><dd>${g.definition}</dd>`).join('')}
    </dl>
  `
  details.append(body)
  return details
}
