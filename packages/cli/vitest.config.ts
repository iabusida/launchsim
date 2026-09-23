import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    exclude: ["**/*.int.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // bin.ts wires real fs/dynamic-import I/O to runCommand and has no
      // logic of its own to test (docs/01: "commands tested with injected
      // I/O" -- that's runCommand itself, covered at 100% separately).
      exclude: ["src/**/*.test.ts", "src/**/index.ts", "src/**/types.ts", "src/bin.ts"],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
      reporter: ["text", "html", "lcov", "json-summary"],
    },
  },
});
