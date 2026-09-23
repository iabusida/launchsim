import { describe, it, expect } from "vitest";
import { renderHtmlReport } from "./html-report.js";
import type { RunResult } from "./run-result.js";

/**
 * A fixed `RunResult` fixture -> exact HTML output, committed under
 * `__golden__/` (docs/04). Update intentionally with `pnpm test -u` and
 * review the diff -- a golden test is a change detector, not a spec.
 */
const FIXTURE: RunResult = {
  schemaVersion: 1,
  tool: { name: "launchsim", version: "0.1.0" },
  scenario: { name: "hourly burn from LP", hash: "a1b2c3d4e5f6", seed: 42 },
  mode: "math",
  market: { kind: "math/pump-curve", params: { feeBps: "100" } },
  durationSlots: 300_000,
  timeline: {
    samples: [
      { slot: 0, quoteReserve: 30_000_000_000_000_000_000n, baseReserve: 1_073_000_000_000_000n },
      { slot: 150_000, quoteReserve: 18_000_000_000_000_000_000n, baseReserve: 1_000_000_000_000_000n },
      { slot: 300_000, quoteReserve: 12_000_000_000_000_000_000n, baseReserve: 950_000_000_000_000n },
    ],
    peakQuoteReserve: 30_000_000_000_000_000_000n,
  },
  mechanicEvents: [
    { slot: 9_000, mechanicId: "lpBurn", baseBurned: 53_650_000_000_000n, quoteSpent: 0n },
  ],
  trades: [
    {
      slot: 0,
      actorId: "sniper-0",
      group: "sniper",
      side: "buy",
      quote: 2_000_000_000_000_000_000n,
      base: 71_000_000_000_000n,
      ok: true,
      reason: null,
    },
    {
      slot: 150,
      actorId: "sniper-0",
      group: "sniper",
      side: "sell",
      quote: 3_800_000_000_000_000_000n,
      base: 71_000_000_000_000n,
      ok: true,
      reason: null,
    },
  ],
  checks: [
    {
      id: "quoteNeverBelowPctOfPeak",
      kind: "quoteNeverBelowPctOfPeak",
      passed: false,
      summary: "pool quote fell to 40% of peak at slot 300000",
      observed: "4000",
      threshold: "5000",
      atSlot: 300_000,
    },
  ],
  passed: false,
  simulated: ["snipers", "hourly LP burn"],
  notSimulated: ["chain-level MEV", "real wallet behavior"],
};

describe("renderHtmlReport (golden)", () => {
  it("matches the committed golden HTML output", async () => {
    const html = renderHtmlReport(FIXTURE, { command: "launchsim run scenarios/hourly-burn-lp.ts", quoteUnit: { symbol: "MON", decimals: 18 } });
    await expect(html).toMatchFileSnapshot("__golden__/hourly-burn-lp.html");
  });
});
