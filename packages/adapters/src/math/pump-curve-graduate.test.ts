import { describe, it, expect } from "vitest";
import { createPumpCurve } from "./pump-curve.js";
import { pumpCurveBuy } from "./pump-curve-trade.js";
import { pumpCurveGraduate } from "./pump-curve-graduate.js";
import { createCpmm } from "./cpmm.js";

describe("pumpCurveGraduate", () => {
  it("hands off the remaining base supply and all raised quote to a new CPMM pool", () => {
    const curve = createPumpCurve(1_000_000n, 1_000_000n, 100n, 15_000n);
    const first = pumpCurveBuy(curve, 10_000n, 0n);
    const graduated = pumpCurveBuy(first.state, 5_000n, 0n).state; // realQuoteReserve: 15_000, realBaseSold: 14_631

    expect(pumpCurveGraduate(graduated)).toEqual(createCpmm(15_000n, 1_000_000n - 14_631n, 100n));
  });

  it("throws when the curve has not reached its graduation threshold", () => {
    const curve = createPumpCurve(1_000_000n, 1_000_000n, 100n, 15_000n);
    const notGraduated = pumpCurveBuy(curve, 10_000n, 0n).state; // realQuoteReserve: 10_000 < 15_000
    expect(() => pumpCurveGraduate(notGraduated)).toThrow(
      /has not reached its graduation threshold/,
    );
  });
});
