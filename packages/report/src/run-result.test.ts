import { describe, it, expect } from "vitest";
import { buildRunResult } from "./run-result.js";
import type { EngineResult, CheckResult } from "@launchsim/core";

function fakeEngineResult(): EngineResult {
  return {
    durationSlots: 100,
    timeline: {
      samples: [{ slot: 0, quoteReserve: 1_000n, baseReserve: 1_000n }],
      peakQuoteReserve: 1_000n,
    },
    trades: [
      { slot: 0, actorId: "a", group: "retail", side: "buy", quote: 100n, base: 90n, ok: true, reason: null },
    ],
    mechanicEvents: [],
    wallets: new Map([["a", { quoteBalance: 0n, baseBalance: 90n, entryPrice: null }]]),
  };
}

function passingCheck(): CheckResult {
  return {
    id: "quoteNeverBelowPctOfPeak",
    kind: "quoteNeverBelowPctOfPeak",
    passed: true,
    summary: "ok",
    observed: "5000",
    threshold: "5000",
    atSlot: null,
  };
}

function failingCheck(): CheckResult {
  return { ...passingCheck(), passed: false, atSlot: 50 };
}

describe("buildRunResult", () => {
  it("assembles the canonical shape from an engine result and checks", () => {
    const result = buildRunResult({
      scenarioName: "hourly burn from LP",
      scenarioHash: "abc123",
      seed: 42,
      toolVersion: "0.1.0",
      mode: "math",
      market: { kind: "math/cpmm", params: { feeBps: "100" } },
      engineResult: fakeEngineResult(),
      checks: [passingCheck()],
      simulated: ["retail actors"],
      notSimulated: ["chain-level MEV"],
    });
    expect(result.schemaVersion).toBe(1);
    expect(result.tool).toEqual({ name: "launchsim", version: "0.1.0" });
    expect(result.scenario).toEqual({ name: "hourly burn from LP", hash: "abc123", seed: 42 });
    expect(result.mode).toBe("math");
    expect(result.durationSlots).toBe(100);
    expect(result.checks).toHaveLength(1);
    expect(result.simulated).toEqual(["retail actors"]);
    expect(result.notSimulated).toEqual(["chain-level MEV"]);
  });

  it("passed is true only when every check passed", () => {
    const base = {
      scenarioName: "s",
      scenarioHash: "h",
      seed: 1,
      toolVersion: "0.1.0",
      mode: "math" as const,
      market: { kind: "math/cpmm", params: {} },
      engineResult: fakeEngineResult(),
      simulated: [],
      notSimulated: ["chain-level MEV"],
    };
    expect(buildRunResult({ ...base, checks: [passingCheck()] }).passed).toBe(true);
    expect(buildRunResult({ ...base, checks: [passingCheck(), failingCheck()] }).passed).toBe(false);
    expect(buildRunResult({ ...base, checks: [] }).passed).toBe(true);
  });

  it("throws when notSimulated is empty (docs/10: mandatory, non-empty)", () => {
    expect(() =>
      buildRunResult({
        scenarioName: "s",
        scenarioHash: "h",
        seed: 1,
        toolVersion: "0.1.0",
        mode: "math",
        market: { kind: "math/cpmm", params: {} },
        engineResult: fakeEngineResult(),
        checks: [],
        simulated: [],
        notSimulated: [],
      }),
    ).toThrow(/notSimulated/);
  });
});
