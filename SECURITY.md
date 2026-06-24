# Security Policy

## Scope: this is teaching code, not a cryptographic product

`crypto-lab-ciphertext-mirror` is an **educational demonstration**. Its ML-KEM core is a
real FIPS 203 implementation validated byte-for-byte against the official NIST
known-answer vectors, but it is written for inspectability and teaching:

- It is **not constant-time hardened** and makes no claim of resistance to timing,
  power, or other side-channel attacks on real hardware.
- It is **not a CAVP-certified module** and must not be used to protect real data.
- The side-channel, oracle, and fault "attacks" in the three cards are **seeded
  simulations** of published mechanisms, not exploits against any deployed system.

Please do **not** file vulnerability reports about the demo crypto being non-constant-time,
non-CAVP, or otherwise unsuitable for production — those properties are intentional and
documented in [`KNOWN-GAPS.md`](./KNOWN-GAPS.md).

## What is in scope

Genuine defects are welcome, for example:

- A deviation of the ML-KEM / SHA-3 core from the FIPS 202 / FIPS 203 specifications
  (i.e. a case where it would fail a known-answer vector).
- A simulation whose behavior contradicts the claim made in its card or in `KNOWN-GAPS.md`.
- A supply-chain or build-pipeline issue (malicious dependency, CI misconfiguration).
- A cross-site-scripting or injection issue in the browser UI.

## How to report

Email **systemslibrarian@gmail.com** with a description and, ideally, a reproduction.
For anything sensitive, please report privately first rather than opening a public issue.
There is no bounty program; this is a personal educational project.

## Supported versions

Only the latest `main` (deployed to GitHub Pages) is maintained.
