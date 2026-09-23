// Stryker mutation testing config for @launchsim/core (docs/07-testing-tdd.md).
// Break threshold 85%, high threshold 95%: coverage says a line ran, mutation
// says a test would notice if it broke.

/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export default {
  packageManager: "pnpm",
  testRunner: "vitest",
  // Explicit: pnpm's workspace layout can put @stryker-mutator/* plugins out
  // of reach of Stryker's default "@stryker-mutator/*" glob resolution.
  plugins: ["@stryker-mutator/vitest-runner"],
  // "off" (not "perTest"): verified empirically that "perTest" misattributes
  // coverage for module-scope zod schema construction (discriminatedUnion
  // etc., evaluated once at import), causing most of scenario/*.schema.ts's
  // mutants to survive for lack of a selected test -- not a real gap. "off"
  // always runs the full suite, which is correct for that code; the
  // vitest.stryker.config.ts variant below keeps it fast by excluding the
  // two expensive end-to-end-style tests from the per-mutant sweep.
  coverageAnalysis: "off",
  vitest: {
    configFile: "vitest.stryker.config.ts",
  },
  mutate: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/*.prop.test.ts",
    "!src/**/index.ts",
    "!src/**/types.ts",
  ],
  thresholds: {
    high: 95,
    low: 85,
    break: 85,
  },
  reporters: ["html", "clear-text", "progress"],
  htmlReporter: {
    fileName: "reports/mutation/index.html",
  },
  tempDirName: ".stryker-tmp",
};
