# 07 — Testing and TDD

This project is test-driven from the first commit. The goal is that nothing in the repo ever becomes "legacy code", meaning code without tests that people are afraid to change.

## The loop (mandatory)

1. **Red.** Write one small test for the next behavior. Run it. It must fail, and fail for the expected reason (not a typo or import error).
2. **Green.** Write the simplest code that makes it pass. Hard-coding is fine if the next test will force generalization.
3. **Refactor.** With all tests green, clean up names, remove duplication, extract functions. Run tests after each change.

Keep the loop short (minutes, not hours). If a step takes longer, the test was too big; split it.

### Worked example: `ceilDiv`

```ts
// packages/core/src/math/ceil-div.test.ts
import { describe, it, expect } from "vitest";
import { ceilDiv } from "./ceil-div";

describe("ceilDiv", () => {
  it("returns the exact quotient when divisible", () => {
    expect(ceilDiv(10n, 5n)).toBe(2n);
  });
  it("rounds up when there is a remainder", () => {
    expect(ceilDiv(11n, 5n)).toBe(3n);
  });
  it("returns 0 for a zero numerator", () => {
    expect(ceilDiv(0n, 7n)).toBe(0n);
  });
  it("throws on a zero denominator", () => {
    expect(() => ceilDiv(1n, 0n)).toThrow(/division by zero/);
  });
  it("throws on negative inputs", () => {
    expect(() => ceilDiv(-1n, 2n)).toThrow(/non-negative/);
  });
});
```

Write the first `it`, watch it fail, implement, then add the next `it`.

## Test pyramid

| Layer | Tool | Where | Runs |
|---|---|---|---|
| Unit | Vitest | next to source (`*.test.ts`) | every commit |
| Property | fast-check in Vitest | `*.prop.test.ts` | every commit |
| Golden / snapshot | Vitest file snapshots | `report`, `blink` (`__golden__/`) | every commit |
| Contract | zod schemas mirroring external specs | `blink` (Actions spec) | every commit |
| Scenario | full engine runs with pinned seeds | `core/test/scenarios/` | every commit |
| Integration | Surfpool / LiteSVM | `*.int.test.ts` | CI job + nightly |
| E2E CLI | spawn built CLI on example scenarios | `cli/test/e2e/` | CI |
| Mutation | Stryker | `packages/core` | nightly + before release |

## Coverage policy

- **Threshold: 100%** lines, branches, functions, statements, per package, enforced in each package's `vitest.config.ts`:

```ts
// packages/core/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    exclude: ["**/*.int.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/index.ts", "src/**/types.ts"],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
      reporter: ["text", "html", "lcov", "json-summary"],
    },
  },
});
```

- `index.ts` files may only re-export; `types.ts` may only declare types. A lint rule enforces both, so excluding them from coverage hides nothing.
- **Chain adapters** (`adapters/src/surfpool/**`) are excluded from the unit gate and covered by integration tests instead. Their pure helpers (instruction encoding, account mapping) live in separate files that *are* unit-tested at 100%.
- `/* v8 ignore */` requires a same-line comment `// coverage-ignore: <reason, PR link>`. A lint rule rejects ignores without it. Expect reviewers to push back.

## Solidity (contracts/) — same rules, Foundry tools

- **TDD with forge:** write the failing `test_...` first (e.g. `test_RevertWhen_AlreadyRecorded`), run `forge test --match-test`, then implement.
- **Naming:** `test_<Behavior>`, `test_RevertWhen_<Condition>`, `testFuzz_<Property>`, `invariant_<Property>`.
- **Coverage:** `forge coverage` must show **100% lines and branches** for every contract in `src/`. Scripts are covered by a deploy test against Anvil.
- **Fuzz:** every function with numeric or bytes inputs gets a fuzz test (`[fuzz] runs = 1000` in CI profile).
- **Invariants:** stateful invariant tests with a handler contract for any state that must never change or must only grow.
- **Events and errors:** assert exact events with `vm.expectEmit` and exact custom errors with `vm.expectRevert(abi.encodeWithSelector(...))`.
- **Static analysis:** `slither .` in CI; high/medium findings fail the build.
- **Formatting:** `forge fmt --check` in CI.

## Mutation testing

- Stryker with the Vitest runner on `packages/core`.
- **Break threshold: 85%.** High threshold 95%.
- Surviving mutants in money math, rounding, or checks must be killed with a new test, not accepted.

## Property tests (required for math and invariants)

```ts
import fc from "fast-check";

it("k never decreases after any sequence of trades", () => {
  fc.assert(
    fc.property(tradeSequenceArb, (trades) => {
      const pool = aPool().build();
      let k = pool.state().quote * pool.state().base;
      for (const t of trades) {
        applyTrade(pool, t);
        const k2 = pool.state().quote * pool.state().base;
        expect(k2 >= k).toBe(true);
        k = k2;
      }
    }),
    { seed: 42, numRuns: 500 },
  );
});
```

Pin `seed` in CI for reproducibility; run an unpinned job nightly to explore new cases, and add any found counterexample as a regular unit test.

## Determinism test

`core/test/determinism.test.ts` runs every file in `scenarios/` twice and asserts the canonical JSON is identical. It also asserts that changing only the seed changes the result (proves the RNG is wired in).

## What good tests look like here

- **Name the behavior:** `it("rejects a sell larger than the wallet balance")`, not `it("works")`.
- **Arrange / Act / Assert**, one behavior per test.
- **Builders over fixtures:** `aScenario().withSnipers(5).build()` from `testkit`.
- **No mocks of our own code in `core`.** Use real objects. Fakes (in-memory `ReportStore`, fake file writer) only at I/O boundaries.
- **No sleeping, no real time, no network** in unit tests.
- **Assert exact values** for money math (`toBe(1234n)`), never "greater than zero" when the exact value is knowable.
- **Test error paths** as carefully as happy paths; they are branches and count toward coverage.

## Scenario tests with pinned expectations

```ts
it("hourly LP burn drains the pool below 50% of peak (seed 42)", () => {
  const result = run(hourlyBurnLp);
  const check = result.checks.find(c => c.kind === "quoteNeverBelowPctOfPeak")!;
  expect(check.passed).toBe(false);
  expect(check.atSlot).toBe(279_000); // pinned; update deliberately if the model changes
});

it("fee-funded buyback keeps the pool above 50% of peak (seed 42)", () => {
  expect(run(feeBuyback).checks.every(c => c.passed)).toBe(true);
});
```

Pinned numbers are placeholders until the model exists; the first real run sets them, and later changes require a changelog note.
