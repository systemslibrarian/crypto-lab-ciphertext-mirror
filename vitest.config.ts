import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'lcov'],
      // Coverage is enforced on the deterministic, unit-tested core: the FIPS 202/203
      // cryptography, the PRNG, the leakage primitives, and the three card simulations.
      // The DOM rendering layer (views, components, canvas viz) is exercised by manual
      // run-throughs rather than unit tests, so it is excluded from the gate.
      include: ['src/lib/**/*.ts', 'src/cards/**/sim.ts'],
      exclude: ['src/**/__tests__/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
