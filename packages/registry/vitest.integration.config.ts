import { defineConfig } from "vitest/config";

/** `*.int.test.ts` only: needs a local `anvil` on PATH (docs/07). No coverage gate -- these are chain-backed, not the unit gate. */
export default defineConfig({
  test: {
    include: ["src/**/*.int.test.ts", "test/**/*.int.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
