# crypto-lab-ciphertext-mirror

## 1. What It Is

This demo is a browser-based educational replay centered on ML-KEM decapsulation behavior, including K-PKE flows and the FO re-encryption comparison path modeled in the code. It illustrates how simulated leakage and oracle behavior can affect key-recovery experiments, and how simulated blinding changes observed outcomes in the same environment. The primitive family is post-quantum public-key cryptography, implemented here as inspectable TypeScript simulation code rather than production cryptographic software. It is intended for mechanism understanding and comparison, not for real-world secure deployment or attack tooling.

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

---

*"Whether you eat or drink, or whatever you do, do all to the glory of God." — 1 Corinthians 10:31*
