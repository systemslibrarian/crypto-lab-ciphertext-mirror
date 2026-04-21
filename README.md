# crypto-lab-ciphertext-mirror

FO re-encryption as oracle: three papers, three replays.

This crypto-lab demo illustrates a specific narrative arc around ML-KEM decapsulation's FO re-encryption check (the mirror): masking fails under realistic leakage assumptions, imperfect oracles still suffice for recovery under adaptive decoding, and NTT+CRT RNR blinding can suppress leakage and improve fault handling in the modeled path.

## Papers

1. Hermelink et al. (2024/060), *The Insecurity of Masked Comparisons: SCAs on ML-KEM's FO-Transform*  
   https://eprint.iacr.org/2024/060
2. Guo, Nabokov, Johansson (2026/070), *Unlocking the True Potential of Decryption Failure Oracles: A Hybrid Adaptive-LDPC Attack on ML-KEM Using Imperfect Oracles*  
   https://eprint.iacr.org/2026/070
3. Duparc, Taha (2025/181), *Improved NTT and CRT-based RNR Blinding for Side-Channel and Fault Resistant Kyber*  
   https://eprint.iacr.org/2025/181

## Stack

- Vite vanilla-ts (no framework)
- TypeScript (strict mode)
- Canvas/SVG visualizations
- WebCrypto wrappers + pure TypeScript simulation code under src/lib/mlkem
- Seeded xoshiro256 PRNG for deterministic simulation runs

## Run

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Test:

```bash
npm run test
```

## Safety and scope

This repository is a pedagogical replay and visualization project, not an attack toolkit and not a claim to break or defeat deployed ML-KEM systems. Simulations run on ephemeral in-memory keys and synthetic leakage/oracle models.

## Live demo

- Placeholder: add GitHub Pages/Netlify URL after deploy

## BibTeX-style citations

```bibtex
@misc{hermelink2024masked,
  author = {Hermelink et al.},
  title = {The Insecurity of Masked Comparisons: SCAs on ML-KEM's FO-Transform},
  year = {2024},
  howpublished = {IACR ePrint 2024/060},
  url = {https://eprint.iacr.org/2024/060}
}

@misc{guo2026imperfect,
  author = {Guo and Nabokov and Johansson},
  title = {Unlocking the True Potential of Decryption Failure Oracles: A Hybrid Adaptive-LDPC Attack on ML-KEM Using Imperfect Oracles},
  year = {2026},
  howpublished = {IACR ePrint 2026/070},
  url = {https://eprint.iacr.org/2026/070}
}

@misc{duparc2025rnr,
  author = {Duparc and Taha},
  title = {Improved NTT and CRT-based RNR Blinding for Side-Channel and Fault Resistant Kyber},
  year = {2025},
  howpublished = {IACR ePrint 2025/181},
  url = {https://eprint.iacr.org/2025/181}
}
```

---

*"So whether you eat or drink or whatever you do, do it all for the glory of God."* — 1 Corinthians 10:31
