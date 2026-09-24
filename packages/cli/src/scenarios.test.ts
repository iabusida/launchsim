import { describe, it, expect } from "vitest";
import { ScenarioConfigSchema } from "@launchsim/core";
import { runScenario } from "./interpreter/run-scenario.js";
import hourlyBurnLp from "../../../scenarios/hourly-burn-lp.js";
import feeBuyback from "../../../scenarios/fee-buyback.js";
import whaleExitMaturePool from "../../../scenarios/whale-exit-mature-pool.js";
import whaleExitWithBuyback from "../../../scenarios/whale-exit-with-buyback.js";

/**
 * Runs every shipped scenario (docs/02: "core/test/determinism.test.ts
 * runs every file in scenarios/ twice and diffs the output") and proves
 * the project's thesis (docs/00, docs/09): the hourly LP burn drains the
 * pool below 50% of its peak and the fee-funded buyback holds it, and
 * that this isn't only a launch-day question -- the same mechanic
 * decides whether an already-mature pool survives a whale exit.
 */
const SCENARIOS = [hourlyBurnLp, feeBuyback, whaleExitMaturePool, whaleExitWithBuyback];

describe("shipped scenarios (docs/02)", () => {
  it.each(SCENARIOS)("$name: running it twice with the same seed is byte-identical", (input) => {
    const config = ScenarioConfigSchema.parse(input);
    const a = runScenario(config);
    const b = runScenario(config);
    const canonical = (r: unknown): string =>
      JSON.stringify(r, (_key: string, value: unknown): unknown =>
        typeof value === "bigint" ? value.toString() : value,
      );
    expect(canonical(a)).toBe(canonical(b));
  });

  it("hourly-burn-lp.ts fails the liquidity check", () => {
    const result = runScenario(ScenarioConfigSchema.parse(hourlyBurnLp));
    const check = result.checks.find((c) => c.kind === "quoteNeverBelowPctOfPeak");
    expect(check?.passed).toBe(false);
  });

  it("fee-buyback.ts passes the liquidity check", () => {
    const result = runScenario(ScenarioConfigSchema.parse(feeBuyback));
    const check = result.checks.find((c) => c.kind === "quoteNeverBelowPctOfPeak");
    expect(check?.passed).toBe(true);
  });

  it("whale-exit-mature-pool.ts (no buyback) fails the drawdown check", () => {
    const result = runScenario(ScenarioConfigSchema.parse(whaleExitMaturePool));
    const check = result.checks.find((c) => c.kind === "maxDrawdownBelow");
    expect(check?.passed).toBe(false);
  });

  it("whale-exit-with-buyback.ts (same actors, same seed, buyback running) passes the drawdown check", () => {
    const result = runScenario(ScenarioConfigSchema.parse(whaleExitWithBuyback));
    const check = result.checks.find((c) => c.kind === "maxDrawdownBelow");
    expect(check?.passed).toBe(true);
  });
});
