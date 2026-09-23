import { describe, it, expect } from "vitest";
import { createGroupSupplyShareBelowCheck } from "./group-supply-share-below.js";
import type { Ledger, TradeRecord } from "../types.js";

function ledgerWithTrades(trades: readonly TradeRecord[]): Ledger {
  return {
    timeline: { samples: [], peakQuoteReserve: 0n },
    trades,
    mechanicEvents: [],
    wallets: new Map(),
  };
}

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

describe("createGroupSupplyShareBelowCheck", () => {
  it("passes when the group's share of circulating supply is below the threshold", () => {
    const check = createGroupSupplyShareBelowCheck("sniper", 100, 1_000n); // 10%
    const ledger = ledgerWithTrades([
      trade({ group: "sniper", base: 50n, slot: 0 }),
      trade({ group: "retail", base: 950n, slot: 10 }),
    ]);
    const result = check.evaluate(ledger);
    expect(result.passed).toBe(true);
    expect(result.id).toBe("groupSupplyShareBelow");
    expect(result.observed).toBe("500");
    expect(result.summary).toBe("sniper held 5% of supply at slot 100, below the 10% limit");
  });

  it("fails when the group's share is exactly at the threshold (below is strict)", () => {
    const check = createGroupSupplyShareBelowCheck("sniper", 100, 1_000n); // 10%
    const ledger = ledgerWithTrades([
      trade({ group: "sniper", base: 100n, slot: 0 }),
      trade({ group: "retail", base: 900n, slot: 10 }),
    ]);
    const result = check.evaluate(ledger);
    expect(result.passed).toBe(false);
    expect(result.id).toBe("groupSupplyShareBelow");
    expect(result.observed).toBe("1000");
    expect(result.summary).toBe(
      "sniper held 10% of supply at slot 100, at or above the 10% limit",
    );
  });

  it("counts a trade landing on exactly the `at` slot", () => {
    const check = createGroupSupplyShareBelowCheck("sniper", 100, 1_000n); // 10%
    const ledger = ledgerWithTrades([trade({ group: "sniper", base: 50n, slot: 100 })]);
    // If the boundary trade were excluded, no supply would exist yet and
    // this would pass vacuously; it must be counted, so it fails outright.
    expect(check.evaluate(ledger).passed).toBe(false);
  });

  it("excludes trades after the `at` slot even when they would flip the result", () => {
    const check = createGroupSupplyShareBelowCheck("sniper", 50, 1_000n); // 10%
    const ledger = ledgerWithTrades([
      trade({ group: "sniper", base: 1n, slot: 0 }),
      trade({ group: "retail", base: 999n, slot: 0 }),
      // Huge future trade: if the slot filter were dropped, this alone
      // would push the share from 0.1% to ~99.9% and flip the result.
      trade({ group: "sniper", base: 1_000_000n, slot: 100 }),
    ]);
    expect(check.evaluate(ledger).passed).toBe(true);
  });

  it("fails when the group's share reaches or exceeds the threshold", () => {
    const check = createGroupSupplyShareBelowCheck("sniper", 100, 1_000n); // 10%
    const ledger = ledgerWithTrades([
      trade({ group: "sniper", base: 340n, slot: 0 }),
      trade({ group: "retail", base: 660n, slot: 10 }),
    ]);
    const result = check.evaluate(ledger);
    expect(result.passed).toBe(false);
    expect(result.atSlot).toBe(100);
  });

  it("only counts trades at or before the `at` slot", () => {
    const check = createGroupSupplyShareBelowCheck("sniper", 50, 1_000n);
    const ledger = ledgerWithTrades([
      trade({ group: "sniper", base: 340n, slot: 0 }),
      trade({ group: "retail", base: 660n, slot: 10 }),
      trade({ group: "sniper", base: 1_000_000n, slot: 100 }), // after `at`, ignored
    ]);
    const result = check.evaluate(ledger);
    expect(result.passed).toBe(false); // 340/1000 = 34% >= 5%
  });

  it("ignores failed trades", () => {
    const check = createGroupSupplyShareBelowCheck("sniper", 100, 1_000n);
    const ledger = ledgerWithTrades([
      trade({ group: "sniper", base: 5_000n, slot: 0, ok: false }),
      trade({ group: "retail", base: 100n, slot: 10 }),
    ]);
    expect(check.evaluate(ledger).passed).toBe(true);
  });

  it("nets out sells: a group that has sold back out no longer counts toward its share", () => {
    const check = createGroupSupplyShareBelowCheck("sniper", 100, 1_000n); // 10%
    const ledger = ledgerWithTrades([
      trade({ group: "sniper", base: 500n, slot: 0, side: "buy" }),
      trade({ group: "sniper", base: 500n, slot: 10, side: "sell" }),
      trade({ group: "retail", base: 1_000n, slot: 20 }),
    ]);
    expect(check.evaluate(ledger).passed).toBe(true);
  });

  it("passes vacuously when no circulating supply exists yet at `at`", () => {
    const check = createGroupSupplyShareBelowCheck("sniper", 100, 1_000n);
    expect(check.evaluate(ledgerWithTrades([])).passed).toBe(true);
  });

  it("reports its id and kind", () => {
    const check = createGroupSupplyShareBelowCheck("sniper", 100, 1_000n);
    expect(check.id).toBe("groupSupplyShareBelow");
    expect(check.evaluate(ledgerWithTrades([])).kind).toBe("groupSupplyShareBelow");
  });
});
