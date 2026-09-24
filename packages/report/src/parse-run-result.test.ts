import { describe, it, expect } from "vitest";
import { toCanonicalJson } from "./canonical-json.js";
import { parseRunResultJson } from "./parse-run-result.js";
import type { RunResult } from "./run-result.js";

const RESULT: RunResult = {
  schemaVersion: 1,
  tool: { name: "launchsim", version: "0.1.0" },
  scenario: { name: "x", hash: "a".repeat(64), seed: 1 },
  mode: "math",
  market: { kind: "math/cpmm", params: { feeBps: "100" } },
  durationSlots: 100,
  timeline: {
    samples: [
      { slot: 0, quoteReserve: 1_000_000_000_000_000_000n, baseReserve: 500n },
      { slot: 50, quoteReserve: 900_000_000_000_000_000n, baseReserve: 600n },
    ],
    peakQuoteReserve: 1_000_000_000_000_000_000n,
  },
  mechanicEvents: [{ slot: 10, mechanicId: "lpBurn", baseBurned: 5n, quoteSpent: 0n }],
  trades: [
    { slot: 0, actorId: "a", group: "retail", side: "buy", quote: 100n, base: 90n, ok: true, reason: null },
  ],
  checks: [
    { id: "a", kind: "quoteNeverBelowPctOfPeak", passed: true, summary: "s", observed: "1", threshold: "1", atSlot: null },
  ],
  passed: true,
  simulated: ["x"],
  notSimulated: ["y"],
};

describe("parseRunResultJson", () => {
  it("round-trips a RunResult through toCanonicalJson with bigints intact", () => {
    const json = toCanonicalJson(RESULT);
    const parsed = parseRunResultJson(json);
    expect(parsed).toEqual(RESULT);
  });

  it("restores bigint types, not just equal-looking strings", () => {
    const parsed = parseRunResultJson(toCanonicalJson(RESULT));
    expect(typeof parsed.timeline.peakQuoteReserve).toBe("bigint");
    expect(typeof parsed.timeline.samples[0]?.quoteReserve).toBe("bigint");
    expect(typeof parsed.timeline.samples[0]?.baseReserve).toBe("bigint");
    expect(typeof parsed.mechanicEvents[0]?.baseBurned).toBe("bigint");
    expect(typeof parsed.mechanicEvents[0]?.quoteSpent).toBe("bigint");
    expect(typeof parsed.trades[0]?.quote).toBe("bigint");
    expect(typeof parsed.trades[0]?.base).toBe("bigint");
  });

  it("round-trips an empty timeline, mechanicEvents, and trades", () => {
    const empty: RunResult = {
      ...RESULT,
      timeline: { samples: [], peakQuoteReserve: 0n },
      mechanicEvents: [],
      trades: [],
    };
    expect(parseRunResultJson(toCanonicalJson(empty))).toEqual(empty);
  });

  it("throws on malformed JSON", () => {
    expect(() => parseRunResultJson("not json")).toThrow();
  });
});
