import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    exclude: ["**/*.int.test.ts"],
    // Default (5000ms) is enough for normal runs, but Stryker's mutation
    // instrumentation adds real per-statement overhead; the full-scenario
    // tests in test/scenarios/ (432,000 simulated slots) need the headroom
    // during `pnpm test:mutation`'s dry run.
    testTimeout: 20_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/index.ts", "src/**/types.ts"],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
      reporter: ["text", "html", "lcov", "json-summary"],
    },
  },
});
