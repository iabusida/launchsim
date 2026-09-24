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
  //
  // A second, narrower static-mutant issue remains even with "off": mutating
  // a whole `z.strictObject({...})` to `{}`, or a discriminatedUnion's
  // discriminant key string to `""`, throws synchronously at module load
  // (reproduced manually, 2026-09-24 -- `z.discriminatedUnion` reads
  // `.shape`/the named key off each option at construction time). Every test
  // that imports the module should therefore fail, but this vitest-runner +
  // coverageAnalysis:"off" combination doesn't classify a module-load-time
  // throw as a kill for *static* mutants specifically (testsCompleted: 0,
  // coveredBy: [] in the JSON report) -- it reports "Survived" instead.
  // Each site is individually annotated with a `// Stryker disable
  // next-line` comment (not a blanket ignore) so field-level mutations
  // inside the same object -- which this tool *does* classify correctly and
  // which real tests do cover per-variant -- stay scored.
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
