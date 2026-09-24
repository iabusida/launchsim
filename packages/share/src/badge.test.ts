import { describe, it, expect } from "vitest";
import type { RunResult } from "@launchsim/report";
import { renderBadgeSvg, renderBadgePng } from "./badge.js";

function result(overrides: Partial<RunResult> = {}): RunResult {
  return {
    schemaVersion: 1,
    tool: { name: "launchsim", version: "0.1.0" },
    scenario: { name: "hourly burn from LP", hash: "a".repeat(64), seed: 1 },
    mode: "math",
    market: { kind: "math/cpmm", params: {} },
    durationSlots: 0,
    timeline: { samples: [], peakQuoteReserve: 0n },
    mechanicEvents: [],
    trades: [],
    checks: [
      { id: "a", kind: "quoteNeverBelowPctOfPeak", passed: false, summary: "pool quote fell to 48% of peak", observed: "4800", threshold: "5000", atSlot: 100 },
    ],
    passed: false,
    simulated: ["x"],
    notSimulated: ["y"],
    ...overrides,
  };
}

describe("renderBadgeSvg", () => {
  it("shows FAIL and the worst failing check's summary when a check failed", () => {
    const svg = renderBadgeSvg(result());
    expect(svg).toContain("FAIL");
    expect(svg).toContain("pool quote fell to 48% of peak");
  });

  it("shows PASS and no failing-check summary when everything passed", () => {
    const svg = renderBadgeSvg(result({ passed: true, checks: [] }));
    expect(svg).toContain("PASS");
    expect(svg).toContain("all checks passed");
  });

  it("includes the scenario name and the honest disclaimer", () => {
    const svg = renderBadgeSvg(result());
    expect(svg).toContain("hourly burn from LP");
    expect(svg).toContain("simulated");
    expect(svg).toContain("not an audit");
  });

  it("escapes an untrusted scenario name (docs/10)", () => {
    const svg = renderBadgeSvg(result({ scenario: { name: "<script>alert(1)</script>", hash: "a".repeat(64), seed: 1 } }));
    expect(svg).not.toContain("<script>alert(1)</script>");
    expect(svg).toContain("&lt;script&gt;");
  });

  it("is a well-formed, self-contained SVG document with no external resource references", () => {
    const svg = renderBadgeSvg(result());
    expect(svg).toContain("<svg");
    expect(svg).not.toContain("<image");
    expect(svg).not.toContain("<script");
    expect(svg).not.toContain("xlink:href");
    expect(svg).not.toContain("cdn.");
  });

  it("is deterministic for the same RunResult", () => {
    expect(renderBadgeSvg(result())).toBe(renderBadgeSvg(result()));
  });
});

describe("renderBadgePng", () => {
  it("renders a valid PNG (correct magic bytes)", () => {
    const png = renderBadgePng(result());
    expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  });

  it("is deterministic for the same RunResult", () => {
    expect(renderBadgePng(result())).toEqual(renderBadgePng(result()));
  });

  it("renders a non-trivial image", () => {
    expect(renderBadgePng(result()).length).toBeGreaterThan(100);
  });
});
