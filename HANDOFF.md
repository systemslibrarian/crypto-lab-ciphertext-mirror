# HANDOFF

## State

All three replays now run faithful, tested simulations of their source papers, with a
guided learning path, accessible controls, and a verified responsive layout.

## Cryptographic core (real FIPS 203, KAT-validated)

- `sha3.ts` — Keccak-f[1600] with SHA3-256/512 and SHAKE128/256 (streaming XOF), validated
  against FIPS 202 example values.
- `fips203.ts` — real ML-KEM: matrix generation, the ML-KEM NTT, CBD sampling, compression,
  ByteEncode/Decode, K-PKE, and the FO transform with implicit rejection.
- `kat.test.ts` / `kat-vectors.json` — byte-exact conformance to the official NIST
  known-answer vectors for ML-KEM-512/768/1024 (KeyGen, Encaps, Decaps, rejection).
- The cards drive this real core through the string-seeded API in `kem.ts`.

## Simulations (all verified by unit tests + visual run-through)

- **Card 1 — Masked comparison (2024/060):** higher-order CPA recovering a real bit of the
  ML-KEM shared secret (from a genuine keygen/encaps/decaps round-trip) through the masked
  decision bit. The distinguisher is the product of the d+1 share leakages; trace cost grows
  exponentially with masking order and the order gap widens with noise.
- **Card 2 — Imperfect DF-oracle (2026/070):** a real hybrid adaptive-LDPC decoder — adaptive
  per-coefficient probes plus random parity checks, fused by sum-product belief propagation.
  Recovery converges for pErr < 0.5 and stalls toward 50% as pErr → 0.5.
- **Card 3 — RNR blinding (2025/181):** a CPA-style correlation distinguisher (evaluated at
  the correct-key hypothesis) on the genuine ML-KEM NTT base-case multiply; the blinded path's
  correlation collapses because the random mask decorrelates the leakage (no hardcoded scaling).
  The blinded integrity check catches an injected bit flip.

## Learning experience

- Collapsible concept primer + 11-term glossary on the landing page.
- Per-card "Key takeaway" + concrete "Experiments to try".
- Verdict banners, Interpretation, and Reality panels separate evidence from claims.

## Accessibility & responsiveness

- Single content `<h1>`, ordered headings (landing cards are `<h3>` under the section
  `<h2>`), one `banner` landmark (the in-page header is `role="group"`), skip link layered
  above the sticky topbar, focus management into the opened replay, `prefers-reduced-motion`.
- Visible labels + live value readouts on every control; `aria-live` run status that
  announces the verdict outcome; `aria-busy` during runs; `role="progressbar"`.
- WCAG AA color: light-theme accent text uses an AA-passing `--accent-text` token; the
  verdict tone and the bar-chart "best" row carry text cues, not color alone.
- Canvases carry text alternatives and render at `devicePixelRatio` (crisp, redraw on
  resize) with labeled, theme-resolved axes.
- Mobile: 44px touch targets on every control and `<summary>`, ≥16px input font (no iOS
  auto-zoom), single-column stacking, and no horizontal overflow down to 320px (bar chart,
  RNR comparison grid, and long seed strings all wrap/collapse).

## Testing, lint & CI

- `npm test` (vitest): 45 tests — FIPS 202 Keccak/SHAKE vectors (incl. a multi-block
  SHAKE squeeze cross-checked against OpenSSL), FIPS 203 NIST KAT conformance, an NTT
  negacyclic-convolution identity, deterministic implicit rejection, ML-KEM round-trip,
  and all three card models.
- `npm run test:coverage` enforces an 80% line/branch/function gate on the crypto + sim
  core (currently ~86% statements / ~89% branches); the gate runs in CI.
- `npm run lint` (ESLint flat config) and `npm run format:check` (Prettier) are clean;
  `.gitattributes` pins LF so the format gate behaves identically on Windows and CI.
- CI installs with a plain `npm ci` (the prior `--legacy-peer-deps` workaround is gone now
  that the `@eslint/js`/`eslint` versions are aligned), pins Node via `.nvmrc`, then lints,
  checks formatting, runs tests with coverage, and builds before deploying to GitHub Pages.

## Known larger follow-ups (see KNOWN-GAPS.md)

- The crypto core is KAT-validated but written for teaching, not constant-time hardened or
  CAVP-certified.
- The card leakage/oracle/fault layers are faithful simulations, not physical measurements;
  they use the paper mechanisms at the level of real CPA / belief-propagation / NTT
  arithmetic but not every implementation-specific constant.
