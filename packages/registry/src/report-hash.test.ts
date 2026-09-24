import { describe, it, expect } from "vitest";
import { toCanonicalJson, hashScenario, type RunResult } from "@launchsim/report";
import { toReportHash } from "./report-hash.js";

const RESULT: RunResult = {
  schemaVersion: 1,
  tool: { name: "launchsim", version: "0.1.0" },
  scenario: { name: "x", hash: "h", seed: 1 },
  mode: "math",
  market: { kind: "math/cpmm", params: {} },
  durationSlots: 0,
  timeline: { samples: [], peakQuoteReserve: 0n },
  mechanicEvents: [],
  trades: [],
  checks: [],
  passed: true,
  simulated: ["x"],
  notSimulated: ["y"],
};

describe("toReportHash", () => {
  it("is 0x followed by the sha256 hex digest of the canonical JSON", () => {
    const expected = `0x${hashScenario(toCanonicalJson(RESULT))}`;
    expect(toReportHash(RESULT)).toBe(expected);
  });

  it("is a 32-byte (64 hex char) hash prefixed with 0x", () => {
    expect(toReportHash(RESULT)).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("changes when the RunResult changes", () => {
    const other: RunResult = { ...RESULT, passed: false };
    expect(toReportHash(RESULT)).not.toBe(toReportHash(other));
  });

  it("is deterministic for the same RunResult", () => {
    expect(toReportHash(RESULT)).toBe(toReportHash({ ...RESULT }));
  });
});
