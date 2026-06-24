# Contributing

Thanks for your interest in this demo. It is part of the
[Crypto Lab](https://crypto-lab.systemslibrarian.dev/) suite of browser-based
cryptography demonstrations.

## Ground rules

This project values **intellectual honesty** above polish. The whole point is that a
reader can inspect the source and trust that:

- the cryptographic core is a real, spec-conformant FIPS 203 / FIPS 202 implementation, and
- every simulated attack/defense is clearly separated from the real crypto, with its
  modeling assumptions and omissions documented.

If your change blurs that line, document it in the relevant card's reality panel and in
[`KNOWN-GAPS.md`](./KNOWN-GAPS.md). Don't make a simulation _look_ more like a real
hardware attack than it is.

## Local setup

```bash
nvm use            # Node 22 (see .nvmrc)
npm ci
npm run dev        # http://localhost:5173
```

## Before you open a pull request

All of these must be green (CI enforces them):

```bash
npm run lint           # ESLint (flat config)
npm run format:check   # Prettier
npm run test:coverage  # Vitest + coverage thresholds on the crypto/sim core
npm run build          # tsc --noEmit + production Vite build
```

- Add or update tests for any behavior change. The crypto core is held to
  known-answer vectors; simulations are held to their stated qualitative properties.
- Keep line endings LF (enforced by `.gitattributes`).
- Match the surrounding code style and comment density.

## Reporting security or correctness issues

See [`SECURITY.md`](./SECURITY.md).
