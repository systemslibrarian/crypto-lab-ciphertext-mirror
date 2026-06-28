# crypto-lab-ciphertext-mirror

## What It Is

This demo is a browser-based educational replay centered on ML-KEM decapsulation behavior, including the K-PKE flow and the FO re-encryption comparison path. The cryptographic core is a **real FIPS 203 implementation** — Keccak/SHA-3, the matrix generation, the ML-KEM NTT, CBD sampling, compression, and the Fujisaki–Okamoto transform — written in inspectable TypeScript and **validated byte-for-byte against the official NIST known-answer vectors** for ML-KEM-512/768/1024. On top of that core, the three cards run *simulated* side-channel leakage, oracle, and blinding experiments to illustrate how the cited attacks and defenses behave. It is intended for mechanism understanding; the core is written for teaching, not constant-time hardened or CAVP-certified, so it is not for real-world deployment or attack tooling.

## When to Use It

- Use this when teaching ML-KEM attack and defense mechanisms in a controlled browser lab.
  It provides deterministic seeded runs and side-by-side visual outputs that make mechanism differences easier to observe.
- Use this when you need to inspect FO comparison and replay logic directly in source code.
  The implementation is local TypeScript, so instrumentation points are visible and editable.
- Use this when demonstrating how noise and oracle quality affect recovery trends.
  The UI exposes parameters like noise sigma and oracle error/availability so sensitivity can be explored interactively.
- Do NOT use this as production cryptography or security assurance evidence — it is a teaching demo that models synthetic conditions and does not certify security behavior on real hardware.

## Live Demo

**[systemslibrarian.github.io/crypto-lab-ciphertext-mirror](https://systemslibrarian.github.io/crypto-lab-ciphertext-mirror/)**

The live demo lets you open three paper-driven card replays and run simulations directly in the browser. You can change controls such as ML-KEM level, seeded run value, noise sigma, oracle error rate, and oracle availability, then observe the resulting charts and mirror-state visuals. The interface models encapsulation/decapsulation behavior and replay metrics for comparison, but it is not a deployment attack tool.

Replay workflow highlights:

- Selecting `Open replay` highlights the chosen paper and moves focus to a replay workspace with paper title, citation, and scope summary.
- Replay runs expose visible execution state (sampling, confidence estimation, and result preparation) before output is shown.
- Each output includes a structured interpretation layer and an explicit limitation statement, not only raw traces or status labels.
- A compact paper-to-demo mapping is included per replay (`Paper claim`, `This demo models`, `This demo omits`).
- Comparison views are available where applicable: Run A vs Run B in masked comparison and unblinded vs blinded A/B in the blinding replay.

## What Can Go Wrong

- A non-constant-time ML-KEM decapsulation can leak through timing or power side channels; the FO re-encryption comparison and decoder steps are classic leakage points that simulated attacks like these target.
- A decapsulation that reveals whether re-encryption matched — a plaintext-checking oracle — can be queried to recover the secret key over many chosen ciphertexts; the FO transform's implicit rejection must not leak this distinction.
- Decoder behavior that depends on secret data (e.g., correction patterns) can give an attacker information; belief-propagation / LDPC-style decoders are sensitive to such leakage.
- Treating simulated, seeded results as physical-device evidence: the experiments model mechanisms, not measured trace budgets or real break costs.
- Reusing or mishandling randomness/NTT state outside a hardened implementation can break the security assumptions the FIPS 203 design relies on.

## Real-World Usage

- ML-KEM (FIPS 203, derived from CRYSTALS-Kyber) is the primary NIST post-quantum key-encapsulation standard for establishing shared secrets.
- It is being deployed in hybrid key exchange (e.g., X25519+ML-KEM) in TLS and other transport protocols as part of post-quantum migration.
- The FO transform shown here is the standard technique for turning a CPA-secure PKE into a CCA-secure KEM, used across lattice and code-based KEMs.
- Constant-time, leakage-resistant ML-KEM implementations are an active engineering concern precisely because of the side-channel and oracle classes this demo illustrates.

## How to Run Locally

```bash
git clone https://github.com/systemslibrarian/crypto-lab-ciphertext-mirror
cd crypto-lab-ciphertext-mirror
npm install
npm run dev
```

No environment variables are required.

## Related Demos
- [crypto-lab-kyber-vault](https://systemslibrarian.github.io/crypto-lab-kyber-vault/) — ML-KEM / FIPS 203 in normal operation, the primitive this demo probes.
- [crypto-lab-kyberslash](https://systemslibrarian.github.io/crypto-lab-kyberslash/) — the KyberSlash division-timing attack on ML-KEM, a concrete side channel.
- [crypto-lab-lattice-fault](https://systemslibrarian.github.io/crypto-lab-lattice-fault/) — fault injection against ML-KEM/ML-DSA, a sibling lattice-attack demo.
- [crypto-lab-hqc-timing](https://systemslibrarian.github.io/crypto-lab-hqc-timing/) — a timing oracle against the HQC code-based KEM, the same decapsulation-leakage theme.
- [crypto-lab-syndrome-drain](https://systemslibrarian.github.io/crypto-lab-syndrome-drain/) — decoding-failure / DOOM attacks on code-based KEMs, another decoder-leakage demo.

## Reality & Limitations

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

*One of 60+ browser demos in the [Crypto Lab](https://crypto-lab.systemslibrarian.dev/) suite.*

*"So whether you eat or drink or whatever you do, do it all for the glory of God." — 1 Corinthians 10:31*
