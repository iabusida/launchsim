import { describe, it, expect } from "vitest";
import type { RunResult } from "@launchsim/report";
import { buildRecordCall } from "./build-record-call.js";
import { reportRegistryAbi } from "./abi.js";
import { toReportHash } from "./report-hash.js";

const REGISTRY_ADDRESS = "0x1111111111111111111111111111111111111111";

function result(overrides: Partial<RunResult> = {}): RunResult {
  return {
    schemaVersion: 1,
    tool: { name: "launchsim", version: "0.1.0" },
    scenario: { name: "x", hash: "abc123".padEnd(64, "0"), seed: 1 },
    mode: "math",
    market: { kind: "math/cpmm", params: {} },
    durationSlots: 0,
    timeline: { samples: [], peakQuoteReserve: 0n },
    mechanicEvents: [],
    trades: [],
    checks: [
      { id: "a", kind: "quoteNeverBelowPctOfPeak", passed: true, summary: "s", observed: "1", threshold: "1", atSlot: null },
      { id: "b", kind: "maxDrawdownBelow", passed: false, summary: "s", observed: "1", threshold: "1", atSlot: 5 },
    ],
    passed: false,
    simulated: ["x"],
    notSimulated: ["y"],
    ...overrides,
  };
}

describe("buildRecordCall", () => {
  it("targets the record function on the given registry address", () => {
    const call = buildRecordCall(result(), "https://example.com/r/abc", REGISTRY_ADDRESS);
    expect(call.address).toBe(REGISTRY_ADDRESS);
    expect(call.abi).toBe(reportRegistryAbi);
    expect(call.functionName).toBe("record");
  });

  it("passes the report hash and scenario hash as 0x-prefixed hex", () => {
    const runResult = result();
    const call = buildRecordCall(runResult, "https://example.com/r/abc", REGISTRY_ADDRESS);
    expect(call.args[0]).toBe(toReportHash(runResult));
    expect(call.args[1]).toBe(`0x${"abc123".padEnd(64, "0")}`);
  });

  it("counts checksPassed and checksTotal from the run's checks", () => {
    const call = buildRecordCall(result(), "https://example.com/r/abc", REGISTRY_ADDRESS);
    expect(call.args[2]).toBe(1); // one passed
    expect(call.args[3]).toBe(2); // two total
  });

  it("passes the tool version and uri through", () => {
    const call = buildRecordCall(result(), "https://example.com/r/abc", REGISTRY_ADDRESS);
    expect(call.args[4]).toBe("0.1.0");
    expect(call.args[5]).toBe("https://example.com/r/abc");
  });

  it("counts zero checksPassed correctly when nothing passed", () => {
    const runResult = result({
      checks: [
        { id: "a", kind: "quoteNeverBelowPctOfPeak", passed: false, summary: "s", observed: "1", threshold: "1", atSlot: 1 },
      ],
    });
    const call = buildRecordCall(runResult, "https://example.com/r/abc", REGISTRY_ADDRESS);
    expect(call.args[2]).toBe(0);
    expect(call.args[3]).toBe(1);
  });
});
