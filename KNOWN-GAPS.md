# KNOWN-GAPS

This project is intentionally honest about simulation boundaries. It models mechanisms from the cited papers, but it does not attempt to replicate full hardware attack conditions.

## Card 1 - 2024/060 Masked comparison leakage

- Models the attack as a higher-order CPA: the masked decision bit (a real bit of the
  ML-KEM shared secret produced by a genuine keygen/encaps/decaps round-trip) is split
  into d+1 Boolean shares, each leaks its centered Hamming weight plus Gaussian noise, and
  the distinguisher is the product of the share leakages (the optimal combiner for
  Boolean masking). This correctly reproduces the order-vs-noise coupling — trace cost
  grows ~exponentially in masking order, and the gap between orders widens with noise.
- The chosen-ciphertext index that selects which secret bit each trace observes is drawn
  from the seeded PRG, so runs stay reproducible; the recovered value is real key material,
  not a synthetic coin.
- Uses an idealized single-bit leakage model, not real silicon power/EM captures, and
  omits cycle-accurate microarchitectural effects, alignment drift, and register reuse.
- Reported trace counts apply a fixed pedagogical scale factor (`TRACE_SCALE`, see
  `sim.ts`) to map the idealized single-bit distinguisher onto a realistic order of
  magnitude. It changes the absolute numbers, never the shape of the story — the counts
  are illustrative, not measured break costs against any implementation.

## Card 2 - 2026/070 Imperfect DF-oracle

- Models the oracle as a binary symmetric channel (flip probability pErr, availability
  alpha) and runs a genuine hybrid adaptive-LDPC decoder: adaptive per-coefficient probes
  plus random degree-6 parity checks, fused by sum-product belief propagation over the
  Tanner graph. Recovery converges for pErr < 0.5 and stalls toward 50% as pErr → 0.5; the
  parity checks measurably correct residual errors that per-coefficient voting alone cannot.
- Does not capture the hardware acquisition pipeline for real DF-oracle observations, nor
  the chosen-ciphertext construction that realizes the oracle in practice.
- Uses a generic random parity-check geometry rather than the paper's specific LDPC code,
  and omits its asymptotic constants and complexity tuning.

## Card 3 - 2025/181 NTT+CRT RNR blinding

- Models the side-channel benefit as an emergent CPA result on the genuine ML-KEM NTT
  base-case multiply (FIPS 203 Algorithm 12, `nttBaseMultiply`): the same distinguisher
  runs on both paths, and the blinded path's correlation collapses because the fresh
  random field element decorrelates the leakage from the attacker's hypothesis. The
  reduction is produced by the masking, not by any hardcoded scaling factor.
- The distinguisher is evaluated at the correct-key hypothesis (it shows whether that
  hypothesis leaks); a full CPA would rank every candidate key. It also leaks the low byte
  (`product & 0xff`) of the 12-bit field element as a single-trace Hamming-weight model.
- Targets one NTT coefficient pair rather than instrumenting the whole NTT/CRT pipeline.
- Uses a simplified single-bit fault model, not multi-fault/adaptive attacker campaigns,
  and omits real compiler lowering / instruction scheduling behavior.
- Does not benchmark real hardware overhead or latency impact.

## Core cryptographic implementation

- The ML-KEM core (`fips203.ts`, `sha3.ts`) is a real FIPS 203 implementation — Keccak,
  K-PKE, the ML-KEM NTT, CBD sampling, compression, and the FO transform — validated
  byte-for-byte against the official NIST known-answer vectors for ML-KEM-512/768/1024
  (KeyGen, Encaps, Decaps, and implicit rejection); see `__tests__/kat.test.ts`.
- It is written for inspectability and teaching, not constant-time hardened, and is not a
  CAVP-certified module. Do not use it to protect real data.
