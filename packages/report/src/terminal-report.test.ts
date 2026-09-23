import { describe, it, expect } from "vitest";
import { renderTerminalReport, exitCodeForResult } from "./terminal-report.js";
import type { RunResult } from "./run-result.js";

function result(overrides: Partial<RunResult> = {}): RunResult {
  return {
    schemaVersion: 1,
    tool: { name: "launchsim", version: "0.1.0" },
    scenario: { name: "hourly burn from LP", hash: "abc", seed: 42 },
    mode: "math",
    market: { kind: "math/pump-curve", params: {} },
    durationSlots: 100,
    timeline: { samples: [], peakQuoteReserve: 0n },
    mechanicEvents: [],
    trades: [],
    checks: [],
    passed: true,
    simulated: [],
    notSimulated: ["chain-level MEV"],
    ...overrides,
  };
}

describe("renderTerminalReport", () => {
  it("renders a passing header with the scenario, seed, mode, and version", () => {
    const output = renderTerminalReport(result(), "./launchsim-report/index.html");
    expect(output).toContain("✓ hourly burn from LP");
    expect(output).toContain("seed 42");
    expect(output).toContain("math mode");
    expect(output).toContain("launchsim 0.1.0");
  });

  it("renders a failing header when passed is false", () => {
    const output = renderTerminalReport(result({ passed: false }), "./out/index.html");
    expect(output).toContain("✗ hourly burn from LP");
  });

  it("renders each check with a pass/fail mark and its summary", () => {
    const output = renderTerminalReport(
      result({
        checks: [
          {
            id: "a",
            kind: "quoteNeverBelowPctOfPeak",
            passed: false,
            summary: "pool SOL fell to 18% of peak at hour 31",
            observed: "1800",
            threshold: "5000",
            atSlot: 100,
          },
          {
            id: "b",
            kind: "maxDrawdownBelow",
            passed: true,
            summary: "max 1h drawdown 41% (limit 80%)",
            observed: "4100",
            threshold: "8000",
            atSlot: null,
          },
        ],
      }),
      "./out/index.html",
    );
    expect(output).toContain("✗ pool SOL fell to 18% of peak at hour 31");
    expect(output).toContain("✓ max 1h drawdown 41% (limit 80%)");
  });

  it("includes the report path", () => {
    const output = renderTerminalReport(result(), "./launchsim-report/index.html");
    expect(output).toContain("report → ./launchsim-report/index.html");
  });
});

describe("exitCodeForResult", () => {
  it("returns 0 when the result passed", () => {
    expect(exitCodeForResult(result({ passed: true }))).toBe(0);
  });

  it("returns 1 when the result failed", () => {
    expect(exitCodeForResult(result({ passed: false }))).toBe(1);
  });

  it("returns 2 when there is no result (invalid scenario or internal error)", () => {
    expect(exitCodeForResult(null)).toBe(2);
  });
});
