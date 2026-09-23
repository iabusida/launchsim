import { describe, it, expect } from "vitest";
import { createCpmm, cpmmQuoteBuy, cpmmQuoteSell } from "./cpmm.js";
import { createPumpCurve, pumpCurveQuoteBuy, pumpCurveQuoteSell } from "./pump-curve.js";

describe("createPumpCurve", () => {
  it("builds a curve from virtual reserves, a fee, and a graduation threshold", () => {
    expect(createPumpCurve(1_000_000n, 1_000_000n, 100n, 15_000n)).toEqual({
      virtualQuoteReserve: 1_000_000n,
      virtualBaseReserve: 1_000_000n,
      realQuoteReserve: 0n,
      realBaseSold: 0n,
      feeBps: 100n,
      quoteFeesCollected: 0n,
      graduationQuoteThreshold: 15_000n,
    });
  });

  it("throws when the virtual quote reserve is not positive", () => {
    expect(() => createPumpCurve(0n, 1_000n, 100n, 15_000n)).toThrow(/positive/);
  });

  it("throws when the virtual base reserve is not positive", () => {
    expect(() => createPumpCurve(1_000n, 0n, 100n, 15_000n)).toThrow(/positive/);
  });

  it("throws when the graduation threshold is not positive", () => {
    expect(() => createPumpCurve(1_000n, 1_000n, 100n, 0n)).toThrow(/positive/);
  });

  it("throws when feeBps is negative", () => {
    expect(() => createPumpCurve(1_000n, 1_000n, -1n, 15_000n)).toThrow(/non-negative/);
  });
});

describe("pumpCurveQuoteBuy", () => {
  it("matches a CPMM quote against the same reserves before any real trading", () => {
    // A freshly created curve's effective reserves equal its virtual reserves
    // (real = 0), so it must quote identically to an equivalent CPMM pool --
    // this is the "virtual reserves smooth the first trade" mechanism.
    const curve = createPumpCurve(1_000_000n, 1_000_000n, 100n, 15_000n);
    const pool = createCpmm(1_000_000n, 1_000_000n, 100n);
    expect(pumpCurveQuoteBuy(curve, 10_000n)).toEqual(cpmmQuoteBuy(pool, 10_000n));
  });
});

describe("pumpCurveQuoteSell", () => {
  it("matches a CPMM quote against the same reserves before any real trading", () => {
    const curve = createPumpCurve(1_000_000n, 1_000_000n, 100n, 15_000n);
    const pool = createCpmm(1_000_000n, 1_000_000n, 100n);
    expect(pumpCurveQuoteSell(curve, 10_000n)).toEqual(cpmmQuoteSell(pool, 10_000n));
  });
});
