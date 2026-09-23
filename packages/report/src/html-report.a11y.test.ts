import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import axe from "axe-core";
import { renderHtmlReport } from "./html-report.js";
import type { RunResult } from "./run-result.js";

/**
 * Accessibility test (docs/04): the rendered HTML passes axe-core with no
 * violations. jsdom does no real layout, so purely visual/contrast rules
 * can't fire meaningfully here -- this still catches structural issues
 * (heading order, table headers, duplicate ids, missing `lang`, ARIA misuse).
 */
function fixture(): RunResult {
  return {
    schemaVersion: 1,
    tool: { name: "launchsim", version: "0.1.0" },
    scenario: { name: "hourly burn from LP", hash: "abc123", seed: 42 },
    mode: "math",
    market: { kind: "math/pump-curve", params: {} },
    durationSlots: 300_000,
    timeline: {
      samples: [
        { slot: 0, quoteReserve: 30_000_000_000n, baseReserve: 1_073_000_000_000_000n },
        { slot: 300_000, quoteReserve: 12_000_000_000n, baseReserve: 950_000_000_000_000n },
      ],
      peakQuoteReserve: 30_000_000_000n,
    },
    mechanicEvents: [],
    trades: [
      {
        slot: 0,
        actorId: "sniper-0",
        group: "sniper",
        side: "buy",
        quote: 2_000_000_000n,
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
}

describe("renderHtmlReport (accessibility)", () => {
  it("has no axe-core violations", async () => {
    const html = renderHtmlReport(fixture(), { command: "launchsim run scenarios/hourly-burn-lp.ts", quoteUnit: { symbol: "MON", decimals: 18 } });
    const dom = new JSDOM(html, { url: "http://localhost/" });
    // axe-core detects its DOM globals from `window`/`document`, which
    // aren't ambient in a plain Node test; jsdom provides them for the
    // duration of this one assertion, then they're removed again.
    const globals = globalThis as { window?: unknown; document?: unknown };
    globals.window = dom.window;
    globals.document = dom.window.document;
    try {
      // axe-core's fallback global-detection needs an Element (with an
      // ownerDocument), not the Document itself.
      const results = await axe.run(dom.window.document.documentElement);
      const summary = results.violations.map((v) => `${v.id}: ${v.description}`).join("\n");
      expect(results.violations, summary).toEqual([]);
    } finally {
      delete globals.window;
      delete globals.document;
    }
  });
});
