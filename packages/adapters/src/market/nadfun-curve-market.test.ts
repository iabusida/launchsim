import { describe, it, expect } from "vitest";
import { createNadfunCurveMarket } from "./nadfun-curve-market.js";
import { createPumpCurveMarket } from "./pump-curve-market.js";

const config = {
  virtualMonReserve: 1_000_000n,
  virtualTokenReserve: 1_000_000n,
  feeBps: 100n,
  graduationQuoteThreshold: 15_000n,
};

describe("createNadfunCurveMarket", () => {
  it("reports its kind as math/nadfun-curve, not math/pump-curve", () => {
    expect(createNadfunCurveMarket(config).kind).toBe("math/nadfun-curve");
  });

  it("exposes the initial state as the curve's virtual reserves", () => {
    expect(createNadfunCurveMarket(config).state()).toEqual({
      quoteReserve: 1_000_000n,
      baseReserve: 1_000_000n,
      quoteFeesCollected: 0n,
    });
  });

  it("trades identically to an equivalently-configured pump-curve market (same underlying math)", () => {
    const nadfun = createNadfunCurveMarket(config);
    const pump = createPumpCurveMarket({
      virtualQuoteReserve: config.virtualMonReserve,
      virtualBaseReserve: config.virtualTokenReserve,
      feeBps: config.feeBps,
      graduationQuoteThreshold: config.graduationQuoteThreshold,
    });

    const nadfunOutcome = nadfun.buy({ quoteIn: 10_000n, minBaseOut: 0n });
    const pumpOutcome = pump.buy({ quoteIn: 10_000n, minBaseOut: 0n });
    expect(nadfunOutcome).toEqual(pumpOutcome);
    expect(nadfun.state()).toEqual(pump.state());
  });

  it("graduates at the same threshold as pump-curve (same graduation semantics)", () => {
    const market = createNadfunCurveMarket(config);
    market.buy({ quoteIn: 15_000n, minBaseOut: 0n });
    const outcome = market.buy({ quoteIn: 1_000n, minBaseOut: 0n });
    expect(outcome).toEqual({ ok: false, reason: "curve graduated" });
  });

  it("burnFromPool() and withdrawFees() delegate to the same pump-curve math", () => {
    const market = createNadfunCurveMarket(config);
    market.buy({ quoteIn: 10_000n, minBaseOut: 0n });
    expect(market.withdrawFees()).toBe(100n);
    market.burnFromPool(1_000n);
    expect(market.state().baseReserve).toBeLessThan(1_000_000n);
  });
});
