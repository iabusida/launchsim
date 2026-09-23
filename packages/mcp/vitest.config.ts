import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    exclude: ["**/*.int.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // bin.ts wires the real MCP stdio transport and has no logic of its
      // own to test, same rationale as packages/cli/src/bin.ts.
      exclude: ["src/**/*.test.ts", "src/**/index.ts", "src/**/types.ts", "src/bin.ts"],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
      reporter: ["text", "html", "lcov", "json-summary"],
    },
  },
});
