# KNOWN-GAPS

This project is intentionally honest about simulation boundaries. It models mechanisms from the cited papers, but it does not attempt to replicate full hardware attack conditions.

## Card 1 - 2024/060 Masked comparison leakage

- Does not use real silicon power traces or EM captures.
- Does not include cycle-accurate microarchitectural effects.
- Does not model implementation-specific alignment drift and register reuse artifacts.
- Uses synthetic Gaussian noise, so trace-count numbers are illustrative only.

## Card 2 - 2026/070 Imperfect DF-oracle

- Does not capture hardware acquisition pipeline for real DF-oracle observations.
- Uses compact LDPC-like structure for live visualization and teaching.
- Does not include full complexity tuning and all asymptotic constants from the paper.

## Card 3 - 2025/181 NTT+CRT RNR blinding

- Does not include real compiler lowering and instruction scheduling behavior.
- Uses simplified single-bit fault model, not multi-fault/adaptive attacker campaigns.
- Does not benchmark real hardware overhead or latency impact.

## Core cryptographic implementation

- The ML-KEM code is pedagogical and instrumentable; it is not certified or production hardened.
- A FIPS CAVP vector ingestion pipeline is not yet integrated in this repo.
