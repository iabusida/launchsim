import { describe, it, expect } from "vitest";
import { summarizeGroups } from "./group-summary.js";
import type { TradeRecord } from "@launchsim/core";

function trade(overrides: Partial<TradeRecord>): TradeRecord {
  return {
    slot: 0,
    actorId: "a",
    group: "retail",
    side: "buy",
    quote: 0n,
    base: 0n,
    ok: true,
    reason: null,
    ...overrides,
  };
}

describe("summarizeGroups", () => {
  it("sums spent (buys) and received (sells) per group", () => {
    const summaries = summarizeGroups([
      trade({ group: "sniper", side: "buy", quote: 1_000n }),
      trade({ group: "sniper", side: "sell", quote: 2_500n }),
    ]);
    expect(summaries).toEqual([
      { group: "sniper", spent: 1_000n, received: 2_500n, pnl: 1_500n },
    ]);
  });

  it("groups are sorted by group name for deterministic output, regardless of trade order", () => {
    const outOfOrder = summarizeGroups([
      trade({ group: "whale", side: "buy", quote: 1n }),
      trade({ group: "retail", side: "buy", quote: 1n }),
    ]);
    expect(outOfOrder.map((s) => s.group)).toEqual(["retail", "whale"]);

    const inOrder = summarizeGroups([
      trade({ group: "retail", side: "buy", quote: 1n }),
      trade({ group: "whale", side: "buy", quote: 1n }),
    ]);
    expect(inOrder.map((s) => s.group)).toEqual(["retail", "whale"]);
  });

  it("ignores failed trades", () => {
    const summaries = summarizeGroups([trade({ group: "sniper", side: "buy", quote: 1_000n, ok: false })]);
    expect(summaries).toEqual([]);
  });

  it("returns an empty array for no trades", () => {
    expect(summarizeGroups([])).toEqual([]);
  });

  it("can report a net loss (negative pnl)", () => {
    const summaries = summarizeGroups([
      trade({ group: "retail", side: "buy", quote: 1_000n }),
      trade({ group: "retail", side: "sell", quote: 400n }),
    ]);
    expect(summaries[0]?.pnl).toBe(-600n);
  });
});
