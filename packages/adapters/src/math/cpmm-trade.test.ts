import { describe, it, expect } from "vitest";
import { createCpmm } from "./cpmm.js";
import { cpmmBuy, cpmmSell } from "./cpmm-trade.js";

describe("cpmmBuy", () => {
  it("fills the trade and updates reserves", () => {
    const pool = createCpmm(1_000_000n, 1_000_000n, 100n);
    const result = cpmmBuy(pool, 10_000n, 0n);
    expect(result.outcome).toEqual({ ok: true, amountOut: 9_802n, feeAmount: 100n });
    // full quoteIn (including fee) enters the reserve -- see docs/02: fees
    // accrue in quote, and stay inside the pool until withdrawn.
    expect(result.state.quoteReserve).toBe(1_010_000n);
    expect(result.state.baseReserve).toBe(1_000_000n - 9_802n);
    expect(result.state.quoteFeesCollected).toBe(100n);
  });

  it("fails on slippage without mutating the pool", () => {
    const pool = createCpmm(1_000_000n, 1_000_000n, 100n);
    const result = cpmmBuy(pool, 10_000n, 9_803n); // one more than the real amountOut
    expect(result.outcome).toEqual({ ok: false, reason: "slippage exceeded" });
    expect(result.state).toEqual(pool);
  });

  it("rejects a zero-amount trade instead of throwing (docs/06)", () => {
    const pool = createCpmm(1_000n, 1_000n, 100n);
    const result = cpmmBuy(pool, 0n, 0n);
    expect(result.outcome).toEqual({ ok: false, reason: "zero-amount" });
    expect(result.state).toEqual(pool);
  });

  it("throws when quoteIn is negative", () => {
    const pool = createCpmm(1_000n, 1_000n, 100n);
    expect(() => cpmmBuy(pool, -1n, 0n)).toThrow(/non-negative/);
  });
});

describe("cpmmSell", () => {
  it("fills the trade and updates reserves", () => {
    const pool = createCpmm(1_000_000n, 1_000_000n, 100n);
    const result = cpmmSell(pool, 10_000n, 0n);
    expect(result.outcome).toEqual({ ok: true, amountOut: 9_801n, feeAmount: 99n });
    expect(result.state.baseReserve).toBe(1_010_000n);
    // reserve only drops by what was actually paid out; the fee stays in
    // the pool, tracked separately in quoteFeesCollected.
    expect(result.state.quoteReserve).toBe(1_000_000n - 9_801n);
    expect(result.state.quoteFeesCollected).toBe(99n);
  });

  it("fails on slippage without mutating the pool", () => {
    const pool = createCpmm(1_000_000n, 1_000_000n, 100n);
    const result = cpmmSell(pool, 10_000n, 9_802n); // one more than the real amountOut
    expect(result.outcome).toEqual({ ok: false, reason: "slippage exceeded" });
    expect(result.state).toEqual(pool);
  });

  it("rejects a zero-amount trade instead of throwing (docs/06)", () => {
    const pool = createCpmm(1_000n, 1_000n, 100n);
    const result = cpmmSell(pool, 0n, 0n);
    expect(result.outcome).toEqual({ ok: false, reason: "zero-amount" });
    expect(result.state).toEqual(pool);
  });

  it("throws when baseIn is negative", () => {
    const pool = createCpmm(1_000n, 1_000n, 100n);
    expect(() => cpmmSell(pool, -1n, 0n)).toThrow(/non-negative/);
  });
});
