import { describe, it, expect } from "vitest";
import { createPumpCurve, effectiveCpmm } from "./pump-curve.js";
import { pumpCurveBuy } from "./pump-curve-trade.js";
import { pumpCurveBurnFromPool, pumpCurveWithdrawFees } from "./pump-curve-mechanics.js";

describe("pumpCurveBurnFromPool", () => {
  it("removes base from the curve's remaining (virtual) supply, not quote", () => {
    const curve = createPumpCurve(1_000_000n, 1_000_000n, 100n, 15_000n);
    const burned = pumpCurveBurnFromPool(curve, 100_000n);
    expect(burned.virtualBaseReserve).toBe(900_000n);
    expect(burned.realQuoteReserve).toBe(0n); // unchanged -- this is the drain (docs/02)
    expect(effectiveCpmm(burned).baseReserve).toBe(900_000n);
  });

  it("burns from what's left after real sales have already reduced the effective supply", () => {
    const curve = createPumpCurve(1_000_000n, 1_000_000n, 100n, 15_000n);
    // Reaching into virtualBaseReserve directly still must respect what's
    // already been sold to buyers (realBaseSold), via effectiveCpmm's math.
    const afterBurn = pumpCurveBurnFromPool(curve, 999_000n);
    expect(effectiveCpmm(afterBurn).baseReserve).toBe(1_000n);
  });

  it("throws when burning more than the curve's effective base reserve", () => {
    const curve = createPumpCurve(1_000n, 1_000n, 100n, 15_000n);
    expect(() => pumpCurveBurnFromPool(curve, 1_000n)).toThrow(/exceeds/);
  });

  it("throws when baseAmount is not positive", () => {
    const curve = createPumpCurve(1_000n, 1_000n, 100n, 15_000n);
    expect(() => pumpCurveBurnFromPool(curve, 0n)).toThrow(/positive/);
  });
});

describe("pumpCurveWithdrawFees", () => {
  it("withdraws accumulated fees, pulling them out of the real reserve", () => {
    const curve = createPumpCurve(1_000_000n, 1_000_000n, 100n, 15_000n);
    const traded = pumpCurveBuy(curve, 10_000n, 0n).state;
    const { state, amount } = pumpCurveWithdrawFees(traded);
    expect(amount).toBe(100n);
    expect(state.quoteFeesCollected).toBe(0n);
    expect(state.realQuoteReserve).toBe(traded.realQuoteReserve - 100n);
  });

  it("withdraws zero when no fees have accrued", () => {
    const curve = createPumpCurve(1_000_000n, 1_000_000n, 100n, 15_000n);
    const { state, amount } = pumpCurveWithdrawFees(curve);
    expect(amount).toBe(0n);
    expect(state).toEqual(curve);
  });
});
