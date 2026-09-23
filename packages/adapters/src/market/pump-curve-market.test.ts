import { describe, it, expect } from "vitest";
import { createPumpCurveMarket } from "./pump-curve-market.js";

const config = {
  virtualQuoteReserve: 1_000_000n,
  virtualBaseReserve: 1_000_000n,
  feeBps: 100n,
  graduationQuoteThreshold: 15_000n,
};

describe("createPumpCurveMarket", () => {
  it("reports its kind", () => {
    expect(createPumpCurveMarket(config).kind).toBe("math/pump-curve");
  });

  it("exposes the initial state as the curve's virtual reserves", () => {
    expect(createPumpCurveMarket(config).state()).toEqual({
      quoteReserve: 1_000_000n,
      baseReserve: 1_000_000n,
      quoteFeesCollected: 0n,
    });
  });

  it("quotes without mutating state", () => {
    const market = createPumpCurveMarket(config);
    expect(market.quoteBuy(10_000n)).toEqual({ amountOut: 9_802n, feeAmount: 100n });
    expect(market.state().quoteReserve).toBe(1_000_000n);
  });

  it("quotes a sell without mutating state", () => {
    const market = createPumpCurveMarket(config);
    market.buy({ quoteIn: 10_000n, minBaseOut: 0n });
    expect(market.quoteSell(5_000n)).toEqual({ amountOut: 5_024n, feeAmount: 50n });
  });

  it("buy() mutates state and returns the trade outcome", () => {
    const market = createPumpCurveMarket(config);
    const outcome = market.buy({ quoteIn: 10_000n, minBaseOut: 0n });
    expect(outcome).toEqual({ ok: true, amountOut: 9_802n, feeAmount: 100n });
    expect(market.state().quoteReserve).toBe(1_010_000n);
  });

  it("sell() mutates state and returns the trade outcome", () => {
    const market = createPumpCurveMarket(config);
    market.buy({ quoteIn: 10_000n, minBaseOut: 0n });
    const outcome = market.sell({ baseIn: 5_000n, minQuoteOut: 0n });
    expect(outcome).toEqual({ ok: true, amountOut: 5_024n, feeAmount: 50n });
  });

  it("reports a failed trade without mutating state (e.g. after graduation)", () => {
    const market = createPumpCurveMarket(config);
    market.buy({ quoteIn: 10_000n, minBaseOut: 0n });
    const beforeGraduation = market.state();
    market.buy({ quoteIn: 5_000n, minBaseOut: 0n }); // reaches the 15_000 threshold, graduates
    const graduated = market.state();
    const outcome = market.buy({ quoteIn: 1_000n, minBaseOut: 0n });
    expect(outcome).toEqual({ ok: false, reason: "curve graduated" });
    expect(market.state()).toEqual(graduated);
    expect(graduated).not.toEqual(beforeGraduation);
  });

  it("burnFromPool() burns from the curve's remaining virtual supply (lpBurn, docs/02)", () => {
    const market = createPumpCurveMarket(config);
    market.burnFromPool(100_000n);
    expect(market.state()).toEqual({
      quoteReserve: 1_000_000n,
      baseReserve: 900_000n,
      quoteFeesCollected: 0n,
    });
  });

  it("withdrawFees() returns and clears accumulated fees", () => {
    const market = createPumpCurveMarket(config);
    market.buy({ quoteIn: 10_000n, minBaseOut: 0n });
    expect(market.withdrawFees()).toBe(100n);
    expect(market.state().quoteFeesCollected).toBe(0n);
  });
});
