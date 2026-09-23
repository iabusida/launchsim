import { describe, it, expect } from "vitest";
import { ScenarioConfigSchema } from "@launchsim/core";
import { runScenario } from "./run-scenario.js";

function scenario(overrides: Record<string, unknown> = {}) {
  return ScenarioConfigSchema.parse({
    schemaVersion: 1,
    name: "test scenario",
    seed: 1,
    duration: "1h",
    token: { supply: "1000000000" },
    market: {
      kind: "cpmm",
      quote: "30000 MON",
      base: "1073000000000000",
      feeBps: "1%",
    },
    actors: [
      {
        group: "retail",
        count: 3,
        spend: "1-2 MON",
        over: "10m",
      },
    ],
    checks: [{ kind: "quoteNeverBelowPctOfPeak", bps: 5000 }],
    ...overrides,
  });
}

describe("runScenario", () => {
  it("runs a complete scenario end to end and produces a RunResult", () => {
    const result = runScenario(scenario());
    expect(result.scenario.name).toBe("test scenario");
    expect(result.scenario.seed).toBe(1);
    expect(result.mode).toBe("math");
    expect(result.market.kind).toBe("math/cpmm");
    expect(result.checks).toHaveLength(1);
    expect(result.checks[0]?.kind).toBe("quoteNeverBelowPctOfPeak");
    expect(result.simulated.length).toBeGreaterThan(0);
    expect(result.notSimulated.length).toBeGreaterThan(0);
  });

  it("is deterministic: the same config and seed produce byte-identical canonical JSON", () => {
    const config = scenario();
    const a = runScenario(config);
    const b = runScenario(config);
    const canonical = (r: unknown): string =>
      JSON.stringify(r, (_key: string, value: unknown): unknown =>
        typeof value === "bigint" ? value.toString() : value,
      );
    expect(canonical(a)).toBe(canonical(b));
  });

  it("changing only the seed changes the trades", () => {
    const a = runScenario(scenario({ seed: 1 }));
    const b = runScenario(scenario({ seed: 2 }));
    expect(a.trades).not.toEqual(b.trades);
  });

  it("evaluates checks against the finished run: a whale's buy-then-dump into a thin pool fails a tight peak check", () => {
    const result = runScenario(
      scenario({
        market: { kind: "cpmm", quote: "1 MON", base: "1000000", feeBps: "1%" },
        actors: [{ group: "whale", spend: "50 MON", at: "0m" }],
        checks: [{ kind: "quoteNeverBelowPctOfPeak", bps: 9000 }],
      }),
    );
    expect(result.passed).toBe(false);
  });

  it("includes configured mechanics in the run and in what was simulated", () => {
    const result = runScenario(
      scenario({
        mechanics: [{ kind: "lpBurn", perHour: ["5%"], stepEvery: "24h" }],
      }),
    );
    expect(result.simulated).toContain("lpBurn");
  });

  it("throws a clear error when the scenario uses an actor group with no engine builder", () => {
    expect(() =>
      runScenario(
        scenario({
          actors: [{ group: "bundler", totalSpend: "5 MON" }],
        }),
      ),
    ).toThrow(/not yet implemented/);
  });
});
