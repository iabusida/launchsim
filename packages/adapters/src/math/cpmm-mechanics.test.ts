import { describe, it, expect } from "vitest";
import { createCpmm } from "./cpmm.js";
import { cpmmBurnFromPool, cpmmWithdrawFees } from "./cpmm-mechanics.js";
import { cpmmBuy } from "./cpmm-trade.js";

describe("cpmmBurnFromPool", () => {
  it("removes base from the pool without touching quote (the drain mechanic)", () => {
    const pool = createCpmm(1_000_000n, 1_000_000n, 100n);
    const burned = cpmmBurnFromPool(pool, 100_000n);
    expect(burned.baseReserve).toBe(900_000n);
    expect(burned.quoteReserve).toBe(1_000_000n); // unchanged -- this is the drain
  });

  it("throws when burning more than the pool holds", () => {
    const pool = createCpmm(1_000n, 1_000n, 100n);
    expect(() => cpmmBurnFromPool(pool, 1_000n)).toThrow(/exceeds/);
  });

  it("throws when baseAmount is not positive", () => {
    const pool = createCpmm(1_000n, 1_000n, 100n);
    expect(() => cpmmBurnFromPool(pool, 0n)).toThrow(/positive/);
  });
});

describe("cpmmWithdrawFees", () => {
  it("withdraws accumulated fees, pulling them out of the reserve", () => {
    const pool = createCpmm(1_000_000n, 1_000_000n, 100n);
    const { state: traded } = cpmmBuy(pool, 10_000n, 0n);
    const { state: withdrawn, amount } = cpmmWithdrawFees(traded);
    expect(amount).toBe(100n);
    expect(withdrawn.quoteFeesCollected).toBe(0n);
    expect(withdrawn.quoteReserve).toBe(traded.quoteReserve - 100n);
  });

  it("withdraws zero when no fees have accrued", () => {
    const pool = createCpmm(1_000_000n, 1_000_000n, 100n);
    const { state, amount } = cpmmWithdrawFees(pool);
    expect(amount).toBe(0n);
    expect(state).toEqual(pool);
  });
});
