import { describe, it, expect } from "vitest";
import { createPumpCurve, isPumpCurveGraduated } from "./pump-curve.js";
import { pumpCurveBuy, pumpCurveSell } from "./pump-curve-trade.js";

describe("pumpCurveBuy", () => {
  it("fills the trade and accumulates real reserves", () => {
    const curve = createPumpCurve(1_000_000n, 1_000_000n, 100n, 15_000n);
    const result = pumpCurveBuy(curve, 10_000n, 0n);
    expect(result.outcome).toEqual({ ok: true, amountOut: 9_802n, feeAmount: 100n });
    expect(result.state.realQuoteReserve).toBe(10_000n);
    expect(result.state.realBaseSold).toBe(9_802n);
    expect(result.state.quoteFeesCollected).toBe(100n);
    expect(isPumpCurveGraduated(result.state)).toBe(false);
  });

  it("graduates once realQuoteReserve reaches the threshold", () => {
    const curve = createPumpCurve(1_000_000n, 1_000_000n, 100n, 15_000n);
    const first = pumpCurveBuy(curve, 10_000n, 0n);
    const second = pumpCurveBuy(first.state, 5_000n, 0n);
    expect(second.outcome).toEqual({ ok: true, amountOut: 4_829n, feeAmount: 50n });
    expect(second.state.realQuoteReserve).toBe(15_000n);
    expect(second.state.realBaseSold).toBe(14_631n);
    expect(isPumpCurveGraduated(second.state)).toBe(true);
  });

  it("fails on slippage without mutating the curve", () => {
    const curve = createPumpCurve(1_000_000n, 1_000_000n, 100n, 15_000n);
    const result = pumpCurveBuy(curve, 10_000n, 9_803n); // one more than the real amountOut
    expect(result.outcome).toEqual({ ok: false, reason: "slippage exceeded" });
    expect(result.state).toEqual(curve);
  });

  it("fails once the curve has graduated, without mutating it", () => {
    const curve = createPumpCurve(1_000_000n, 1_000_000n, 100n, 15_000n);
    const first = pumpCurveBuy(curve, 10_000n, 0n);
    const graduated = pumpCurveBuy(first.state, 5_000n, 0n).state;
    const result = pumpCurveBuy(graduated, 1_000n, 0n);
    expect(result.outcome).toEqual({ ok: false, reason: "curve graduated" });
    expect(result.state).toEqual(graduated);
  });

  it("rejects a zero-amount trade instead of throwing (docs/06)", () => {
    const curve = createPumpCurve(1_000n, 1_000n, 100n, 15_000n);
    const result = pumpCurveBuy(curve, 0n, 0n);
    expect(result.outcome).toEqual({ ok: false, reason: "zero-amount" });
    expect(result.state).toEqual(curve);
  });

  it("throws when quoteIn is negative", () => {
    const curve = createPumpCurve(1_000n, 1_000n, 100n, 15_000n);
    expect(() => pumpCurveBuy(curve, -1n, 0n)).toThrow(/non-negative/);
  });
});

describe("pumpCurveSell", () => {
  it("fills the trade and reduces real reserves", () => {
    const curve = createPumpCurve(1_000_000n, 1_000_000n, 100n, 15_000n);
    const afterBuy = pumpCurveBuy(curve, 10_000n, 0n).state;
    const result = pumpCurveSell(afterBuy, 5_000n, 0n);
    expect(result.outcome).toEqual({ ok: true, amountOut: 5_024n, feeAmount: 50n });
    expect(result.state.realQuoteReserve).toBe(4_976n);
    expect(result.state.realBaseSold).toBe(4_802n);
    expect(result.state.quoteFeesCollected).toBe(150n); // 100 from the buy + 50 from this sell
  });

  it("fails when selling more base than the curve has sold", () => {
    const curve = createPumpCurve(1_000_000n, 1_000_000n, 100n, 15_000n);
    const afterBuy = pumpCurveBuy(curve, 10_000n, 0n).state; // realBaseSold: 9_802
    const result = pumpCurveSell(afterBuy, 9_803n, 0n);
    expect(result.outcome).toEqual({ ok: false, reason: "insufficient curve supply" });
    expect(result.state).toEqual(afterBuy);
  });

  it("fails on slippage without mutating the curve", () => {
    const curve = createPumpCurve(1_000_000n, 1_000_000n, 100n, 15_000n);
    const afterBuy = pumpCurveBuy(curve, 10_000n, 0n).state;
    const result = pumpCurveSell(afterBuy, 5_000n, 5_025n); // one more than the real amountOut
    expect(result.outcome).toEqual({ ok: false, reason: "slippage exceeded" });
    expect(result.state).toEqual(afterBuy);
  });

  it("rejects a zero-amount trade instead of throwing (docs/06)", () => {
    const curve = createPumpCurve(1_000n, 1_000n, 100n, 15_000n);
    const result = pumpCurveSell(curve, 0n, 0n);
    expect(result.outcome).toEqual({ ok: false, reason: "zero-amount" });
    expect(result.state).toEqual(curve);
  });

  it("throws when baseIn is negative", () => {
    const curve = createPumpCurve(1_000n, 1_000n, 100n, 15_000n);
    expect(() => pumpCurveSell(curve, -1n, 0n)).toThrow(/non-negative/);
  });
});
