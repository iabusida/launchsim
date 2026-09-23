import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config.js";

/**
 * A Stryker-only variant of the normal vitest config (docs/07's usual
 * config still governs `pnpm test`). Excludes the two expensive
 * end-to-end-style tests (a 48h/400ms-slot engine run and a 300-actor
 * perf check): asking `coverageAnalysis: "off"` to re-run them for every
 * mutant is what made a full mutation run take 13+ minutes. They still
 * run under normal `pnpm test`; only the per-mutant sweep skips them.
 */
export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      exclude: [
        "**/*.int.test.ts",
        "test/scenarios/**/*.test.ts",
        "src/engine/perf-check.test.ts",
      ],
    },
  }),
);
