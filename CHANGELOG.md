# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-06-24

First stable release. The demo is feature-complete: a real, NIST-KAT-validated FIPS 203
ML-KEM core driving three faithful, unit-tested replays of published side-channel results,
with an accessible, responsive UI.

### Added

- Independent test coverage for the cryptographic core: SHAKE128/256 multi-block squeeze
  cross-checked against OpenSSL, an NTT negacyclic-convolution identity test, and a
  deterministic implicit-rejection test.
- Coverage tooling (`npm run test:coverage`) with an 80% gate on the crypto/sim core,
  enforced in CI.
- `.gitattributes` (LF normalization), `.nvmrc`, an `engines` field, `SECURITY.md`,
  `CONTRIBUTING.md`, and social/Open Graph preview meta tags.

### Changed

- Card 1 (masked comparison) now recovers a real bit of the ML-KEM shared secret from a
  genuine keygen/encaps/decaps round-trip, instead of a discarded round-trip plus a
  synthetic coin. Documentation wording across the cards was tightened to match exactly
  what each simulation does (e.g. the blinding card is a correlation distinguisher at the
  correct-key hypothesis, not a full key-ranking CPA).
- Light-theme accent text now uses an AA-passing color token; the in-page header no longer
  creates a second `banner` landmark and the page exposes a single content-level `<h1>`.
- Run completions announce the verdict (not a generic "complete") and toggle `aria-busy`
  for assistive technology.
- CI installs without `--legacy-peer-deps` (the underlying `@eslint/js`/`eslint` version
  mismatch was corrected) and pins Node via `.nvmrc`.

### Fixed

- The masked-comparison **"Target bit (0–255)" control was a no-op** (it only reseeded the
  run); it now genuinely selects which real shared-secret bit the higher-order CPA recovers.
- A **duplicate, overlapping theme toggle** rendered by the in-page header (the shared
  topbar's hide rule never matched it) has been removed along with its dead wiring.
- The run verdict was **announced twice** to screen readers (banner `role="status"` plus the
  run-status live region); the banner is no longer a live region.
- **Mobile**: bar-chart rows and the RNR comparison grid no longer overflow horizontally on
  small phones; sliders, inputs, and `<summary>` toggles now meet the 44px touch-target
  minimum; inputs use ≥16px font to stop iOS auto-zoom; the replay "Close" button moves to
  the top of the stacked header on phones.
- **Canvas charts** render at `devicePixelRatio` (crisp, not stretched) and redraw on resize.

### Removed

- Dead `Footer.ts` component and its unused styles.
