# crypto-lab-ciphertext-mirror

## 1. What It Is

This demo is a browser-based educational replay centered on ML-KEM decapsulation behavior, including the K-PKE flow and the FO re-encryption comparison path. The cryptographic core is a **real FIPS 203 implementation** — Keccak/SHA-3, the matrix generation, the ML-KEM NTT, CBD sampling, compression, and the Fujisaki–Okamoto transform — written in inspectable TypeScript and **validated byte-for-byte against the official NIST known-answer vectors** for ML-KEM-512/768/1024. On top of that core, the three cards run *simulated* side-channel leakage, oracle, and blinding experiments to illustrate how the cited attacks and defenses behave. It is intended for mechanism understanding; the core is written for teaching, not constant-time hardened or CAVP-certified, so it is not for real-world deployment or attack tooling.

## 2. When to Use It

- Use this when teaching ML-KEM attack and defense mechanisms in a controlled browser lab.
  It provides deterministic seeded runs and side-by-side visual outputs that make mechanism differences easier to observe.
- Use this when you need to inspect FO comparison and replay logic directly in source code.
  The implementation is local TypeScript, so instrumentation points are visible and editable.
- Use this when demonstrating how noise and oracle quality affect recovery trends.
  The UI exposes parameters like noise sigma and oracle error/availability so sensitivity can be explored interactively.
- Do not use this as production cryptography or security assurance evidence.
  The repository explicitly models synthetic conditions and does not certify security behavior on real hardware.

## 3. Live Demo

https://systemslibrarian.github.io/crypto-lab-ciphertext-mirror/

The live demo lets you open three paper-driven card replays and run simulations directly in the browser. You can change controls such as ML-KEM level, seeded run value, noise sigma, oracle error rate, and oracle availability, then observe the resulting charts and mirror-state visuals. The interface models encapsulation/decapsulation behavior and replay metrics for comparison, but it is not a deployment attack tool.

Replay workflow highlights:

- Selecting `Open replay` highlights the chosen paper and moves focus to a replay workspace with paper title, citation, and scope summary.
- Replay runs expose visible execution state (sampling, confidence estimation, and result preparation) before output is shown.
- Each output includes a structured interpretation layer and an explicit limitation statement, not only raw traces or status labels.
- A compact paper-to-demo mapping is included per replay (`Paper claim`, `This demo models`, `This demo omits`).
- Comparison views are available where applicable: Run A vs Run B in masked comparison and unblinded vs blinded A/B in the blinding replay.

## 4. How to Run Locally

```bash
git clone https://github.com/systemslibrarian/crypto-lab-ciphertext-mirror
cd crypto-lab-ciphertext-mirror
npm install
npm run dev
```

No environment variables are required.

## 5. Part of the Crypto-Lab Suite

One of 60+ live browser demos at [systemslibrarian.github.io/crypto-lab](https://systemslibrarian.github.io/crypto-lab/) — spanning Atbash (600 BCE) through NIST FIPS 203/204/205 (2024).

### Reality & Limitations

- The ML-KEM core is real and NIST-KAT-validated; the **side-channel, oracle, and fault
  experiments layered on top are seeded simulations**, not physical measurements.
- It does not claim exploit success rates, trace budgets, or break costs on physical devices.
- Paper-specific math is reproduced at mechanism level (real higher-order CPA, real
  belief-propagation LDPC decoding, real NTT arithmetic) but not every asymptotic constant.

## Why this demo is trustworthy

- The cryptographic core passes the official FIPS 203 known-answer vectors for all three
  parameter sets (KeyGen, Encaps, Decaps, implicit rejection) — see `kat.test.ts`.
- Keccak is validated against the FIPS 202 SHA-3 / SHAKE example values.
- Every card includes a paper citation, a simulation mapping, and an explicit omission list.
- The code is inspectable TypeScript with deterministic seeds for reproducible replays, and
  the UI separates evidence from interpretation and from non-claims.

---

*"Whether you eat or drink, or whatever you do, do all to the glory of God." — 1 Corinthians 10:31*
