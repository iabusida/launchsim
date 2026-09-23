import { describe, it, expect } from "vitest";
import { createCpmmMarket } from "./cpmm-market.js";

describe("createCpmmMarket", () => {
  it("reports its kind", () => {
    const market = createCpmmMarket({ quoteReserve: 1_000_000n, baseReserve: 1_000_000n, feeBps: 100n });
    expect(market.kind).toBe("math/cpmm");
  });

  it("exposes the initial state", () => {
    const market = createCpmmMarket({ quoteReserve: 1_000_000n, baseReserve: 1_000_000n, feeBps: 100n });
    expect(market.state()).toEqual({
      quoteReserve: 1_000_000n,
      baseReserve: 1_000_000n,
      quoteFeesCollected: 0n,
    });
  });

  it("quotes without mutating state", () => {
    const market = createCpmmMarket({ quoteReserve: 1_000_000n, baseReserve: 1_000_000n, feeBps: 100n });
    const quote = market.quoteBuy(10_000n);
    expect(quote).toEqual({ amountOut: 9_802n, feeAmount: 100n });
    expect(market.state().quoteReserve).toBe(1_000_000n);
  });

  it("quotes a sell without mutating state", () => {
    const market = createCpmmMarket({ quoteReserve: 1_000_000n, baseReserve: 1_000_000n, feeBps: 100n });
    expect(market.quoteSell(10_000n)).toEqual({ amountOut: 9_801n, feeAmount: 99n });
  });

  it("buy() mutates state and returns the trade outcome", () => {
    const market = createCpmmMarket({ quoteReserve: 1_000_000n, baseReserve: 1_000_000n, feeBps: 100n });
    const outcome = market.buy({ quoteIn: 10_000n, minBaseOut: 0n });
    expect(outcome).toEqual({ ok: true, amountOut: 9_802n, feeAmount: 100n });
    expect(market.state().quoteReserve).toBe(1_010_000n);
  });

  it("sell() mutates state and returns the trade outcome", () => {
    const market = createCpmmMarket({ quoteReserve: 1_000_000n, baseReserve: 1_000_000n, feeBps: 100n });
    const outcome = market.sell({ baseIn: 10_000n, minQuoteOut: 0n });
    expect(outcome).toEqual({ ok: true, amountOut: 9_801n, feeAmount: 99n });
    expect(market.state().baseReserve).toBe(1_010_000n);
  });

  it("reports a failed trade without mutating state", () => {
    const market = createCpmmMarket({ quoteReserve: 1_000_000n, baseReserve: 1_000_000n, feeBps: 100n });
    const outcome = market.buy({ quoteIn: 10_000n, minBaseOut: 9_803n });
    expect(outcome).toEqual({ ok: false, reason: "slippage exceeded" });
    expect(market.state().quoteReserve).toBe(1_000_000n);
  });

  it("burnFromPool() mutates the base reserve only", () => {
    const market = createCpmmMarket({ quoteReserve: 1_000_000n, baseReserve: 1_000_000n, feeBps: 100n });
    market.burnFromPool(100_000n);
    expect(market.state()).toEqual({
      quoteReserve: 1_000_000n,
      baseReserve: 900_000n,
      quoteFeesCollected: 0n,
    });
  });

  it("withdrawFees() returns and clears accumulated fees", () => {
    const market = createCpmmMarket({ quoteReserve: 1_000_000n, baseReserve: 1_000_000n, feeBps: 100n });
    market.buy({ quoteIn: 10_000n, minBaseOut: 0n });
    const amount = market.withdrawFees();
    expect(amount).toBe(100n);
    expect(market.state().quoteFeesCollected).toBe(0n);
  });
});
