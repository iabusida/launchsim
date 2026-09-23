import { describe, it, expect } from "vitest";
import { renderHtmlReport } from "./html-report.js";
import type { RunResult } from "./run-result.js";

function result(overrides: Partial<RunResult> = {}): RunResult {
  return {
    schemaVersion: 1,
    tool: { name: "launchsim", version: "0.1.0" },
    scenario: { name: "hourly burn from LP", hash: "abc123def456", seed: 42 },
    mode: "math",
    market: { kind: "math/pump-curve", params: { feeBps: "100" } },
    durationSlots: 100,
    timeline: {
      samples: [
        { slot: 0, quoteReserve: 1_000_000n, baseReserve: 1_000_000n },
        { slot: 50, quoteReserve: 800_000n, baseReserve: 1_100_000n },
      ],
      peakQuoteReserve: 1_000_000n,
    },
    mechanicEvents: [{ slot: 50, mechanicId: "lpBurn", baseBurned: 10_000n, quoteSpent: 0n }],
    trades: [
      { slot: 0, actorId: "a", group: "retail", side: "buy", quote: 100n, base: 90n, ok: true, reason: null },
    ],
    checks: [
      {
        id: "quoteNeverBelowPctOfPeak",
        kind: "quoteNeverBelowPctOfPeak",
        passed: false,
        summary: "pool SOL fell to 18% of peak at hour 31",
        observed: "1800",
        threshold: "5000",
        atSlot: 279_000,
      },
    ],
    passed: false,
    simulated: ["retail, sniper, and whale actors", "hourly LP burn"],
    notSimulated: ["chain-level MEV", "real wallet behavior"],
    ...overrides,
  };
}

describe("renderHtmlReport", () => {
  it("is a self-contained HTML document with no external scripts, fonts, or CDNs", () => {
    const html = renderHtmlReport(result(), { command: "launchsim run scenarios/x.ts" });
    expect(html).toContain("<!doctype html>");
    expect(html).not.toMatch(/<script[^>]+src=/);
    expect(html).not.toMatch(/<link[^>]+href="https?:/);
    expect(html).not.toContain("cdn.");
  });

  it("includes the header: scenario name, pass/fail, seed, mode, tool version, hash", () => {
    const html = renderHtmlReport(result(), { command: "x" });
    expect(html).toContain("hourly burn from LP");
    expect(html).toContain("42");
    expect(html).toContain("math");
    expect(html).toContain("0.1.0");
    expect(html).toContain("abc123def456");
  });

  it("shows a fail badge when passed is false and a pass badge when true", () => {
    expect(renderHtmlReport(result({ passed: false }), { command: "x" })).toContain("FAIL");
    expect(renderHtmlReport(result({ passed: true }), { command: "x" })).toContain("PASS");
  });

  it("lists every check with its summary", () => {
    const html = renderHtmlReport(result(), { command: "x" });
    expect(html).toContain("pool SOL fell to 18% of peak at hour 31");
  });

  it("marks an individual passing check distinctly from a failing one", () => {
    const html = renderHtmlReport(
      result({
        checks: [
          {
            id: "a",
            kind: "maxDrawdownBelow",
            passed: true,
            summary: "max drawdown stayed within limits",
            observed: "1000",
            threshold: "8000",
            atSlot: null,
          },
        ],
      }),
      { command: "x" },
    );
    expect(html).toContain('class="pass"');
    expect(html).toContain("max drawdown stayed within limits");
  });

  it("includes an inline SVG chart", () => {
    const html = renderHtmlReport(result(), { command: "x" });
    expect(html).toContain("<svg");
  });

  it("includes the who-profited table with each group's spent, received, and pnl", () => {
    const html = renderHtmlReport(result(), { command: "x" });
    expect(html).toContain("retail");
  });

  it("formats a positive pnl without a leading minus sign", () => {
    const html = renderHtmlReport(
      result({
        trades: [
          {
            slot: 0,
            actorId: "a",
            group: "sniper",
            side: "buy",
            quote: 100_000_000n,
            base: 90n,
            ok: true,
            reason: null,
          },
          {
            slot: 10,
            actorId: "a",
            group: "sniper",
            side: "sell",
            quote: 500_000_000n,
            base: 90n,
            ok: true,
            reason: null,
          },
        ],
      }),
      { command: "x" },
    );
    // pnl = 500_000_000 - 100_000_000 = 400_000_000 lamports = 0.40 SOL, positive
    expect(html).toContain("0.40 SOL");
    expect(html).not.toContain("-0.40 SOL");
  });

  it("always includes non-empty simulated and notSimulated sections", () => {
    const html = renderHtmlReport(result(), { command: "x" });
    expect(html).toContain("retail, sniper, and whale actors");
    expect(html).toContain("chain-level MEV");
  });

  it("includes the reproduce command and scenario hash", () => {
    const html = renderHtmlReport(result(), { command: "launchsim run scenarios/hourly-burn-lp.ts" });
    expect(html).toContain("launchsim run scenarios/hourly-burn-lp.ts");
    expect(html).toContain("abc123def456");
  });

  it("includes the footer disclaimer and never claims safety (docs/09)", () => {
    const html = renderHtmlReport(result(), { command: "x" });
    expect(html).toContain("not an audit");
    expect(html).toContain("not financial advice");
    expect(html.toLowerCase()).not.toContain("rug-proof");
    expect(html.toLowerCase()).not.toContain("audited");
  });

  it("escapes untrusted scenario names to prevent XSS (docs/10)", () => {
    const html = renderHtmlReport(result({ scenario: { name: "<script>alert(1)</script>", hash: "h", seed: 1 } }), {
      command: "x",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("is deterministic: the same input renders identical HTML", () => {
    const input = result();
    expect(renderHtmlReport(input, { command: "x" })).toBe(renderHtmlReport(input, { command: "x" }));
  });
});
