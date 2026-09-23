import { describe, it, expect, vi } from "vitest";
import { runCommand, quoteUnitFromResult } from "./run.js";
import type { ScenarioConfigInput } from "@launchsim/core";
import type { RunResult } from "@launchsim/report";

const VALID_SCENARIO: ScenarioConfigInput = {
  schemaVersion: 1,
  name: "test scenario",
  seed: 1,
  duration: "1h",
  token: { supply: "1000000" },
  market: { kind: "cpmm", quote: "30 MON", base: "1073000000000000", feeBps: "1%" },
  actors: [{ group: "retail", count: 2, spend: "0.1-1 MON", over: "10m" }],
  checks: [{ kind: "quoteNeverBelowPctOfPeak", bps: 5000 }],
};

function fakeIo(moduleValue: unknown) {
  const files = new Map<string, string>();
  const lines: string[] = [];
  return {
    io: {
      readScenario: vi.fn(() => Promise.resolve(moduleValue)),
      writeFile: vi.fn((path: string, content: string) => {
        files.set(path, content);
        return Promise.resolve();
      }),
      log: vi.fn((line: string) => {
        lines.push(line);
      }),
    },
    files,
    lines,
  };
}

function fakeRunResult(params: Record<string, string>): RunResult {
  return {
    schemaVersion: 1,
    tool: { name: "launchsim", version: "0.1.0" },
    scenario: { name: "x", hash: "h", seed: 1 },
    mode: "math",
    market: { kind: "math/cpmm", params },
    durationSlots: 0,
    timeline: { samples: [], peakQuoteReserve: 0n },
    mechanicEvents: [],
    trades: [],
    checks: [],
    passed: true,
    simulated: ["x"],
    notSimulated: ["y"],
  };
}

describe("quoteUnitFromResult", () => {
  it("reads the quote unit from market params", () => {
    const result = fakeRunResult({ quoteSymbol: "MON", quoteDecimals: "18" });
    expect(quoteUnitFromResult(result)).toEqual({ symbol: "MON", decimals: 18 });
  });

  it("throws a clear error when quoteSymbol is missing", () => {
    const result = fakeRunResult({ quoteDecimals: "18" });
    expect(() => quoteUnitFromResult(result)).toThrow(/missing its quote unit/);
  });

  it("throws a clear error when quoteDecimals is missing", () => {
    const result = fakeRunResult({ quoteSymbol: "MON" });
    expect(() => quoteUnitFromResult(result)).toThrow(/missing its quote unit/);
  });
});

describe("runCommand", () => {
  it("runs a scenario module exported as `default` and writes json + html reports", async () => {
    const { io, files, lines } = fakeIo({ default: VALID_SCENARIO });
    const exitCode = await runCommand("scenarios/test.js", io);
    expect(exitCode).toBe(0);
    expect(files.has("launchsim-report/result.json")).toBe(true);
    expect(files.has("launchsim-report/index.html")).toBe(true);
    expect(files.get("launchsim-report/index.html")).toContain("<!doctype html>");
    expect(lines.some((l) => l.includes("test scenario"))).toBe(true);
  });

  it("accepts a scenario module exported without a `default` wrapper", async () => {
    const { io } = fakeIo(VALID_SCENARIO);
    const exitCode = await runCommand("scenarios/test.js", io);
    expect(exitCode).toBe(0);
  });

  it("returns exit code 1 when a check fails", async () => {
    const failing: ScenarioConfigInput = {
      ...VALID_SCENARIO,
      checks: [{ kind: "quoteNeverBelowPctOfPeak", bps: 10_000 }],
      market: { kind: "cpmm", quote: "1 MON", base: "1000000", feeBps: "1%" },
      actors: [{ group: "whale", spend: "50 MON" }],
    };
    const { io } = fakeIo({ default: failing });
    const exitCode = await runCommand("scenarios/test.js", io);
    expect(exitCode).toBe(1);
  });

  it("returns exit code 2 and logs an error when the config is invalid", async () => {
    const { io, lines } = fakeIo({ default: { name: "bad" } });
    const exitCode = await runCommand("scenarios/bad.js", io);
    expect(exitCode).toBe(2);
    expect(lines.some((l) => l.includes("error"))).toBe(true);
  });

  it("stringifies a non-Error thrown value", async () => {
    const io = {
      readScenario: vi.fn(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- deliberately testing non-Error throw handling
        throw "boom";
      }),
      writeFile: vi.fn(() => Promise.resolve()),
      log: vi.fn(),
    };
    const exitCode = await runCommand("scenarios/missing.js", io);
    expect(exitCode).toBe(2);
    expect(io.log).toHaveBeenCalledWith("error: boom");
  });

  it("returns exit code 2 when the module fails to load", async () => {
    const io = {
      readScenario: vi.fn(() => {
        throw new Error("module not found");
      }),
      writeFile: vi.fn(() => Promise.resolve()),
      log: vi.fn(),
    };
    const exitCode = await runCommand("scenarios/missing.js", io);
    expect(exitCode).toBe(2);
    expect(io.log).toHaveBeenCalledWith(expect.stringContaining("module not found"));
  });

  it("prints the reproduce command with the given scenario path", async () => {
    const { io, files } = fakeIo({ default: VALID_SCENARIO });
    await runCommand("scenarios/test.js", io);
    expect(files.get("launchsim-report/index.html")).toContain("scenarios/test.js");
  });
});
