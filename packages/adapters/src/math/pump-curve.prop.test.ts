import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createPumpCurve, effectiveCpmm, type PumpCurveState } from "./pump-curve.js";
import { pumpCurveBuy, pumpCurveSell } from "./pump-curve-trade.js";

const reserveArb = fc.bigInt({ min: 1_000_000n, max: 10n ** 15n });
const feeBpsArb = fc.bigInt({ min: 0n, max: 1_000n }); // 0-10%
const tradeAmountArb = fc.bigInt({ min: 1n, max: 10n ** 9n });

interface Trade {
  readonly kind: "buy" | "sell";
  readonly amount: bigint;
}

const tradeArb: fc.Arbitrary<Trade> = fc.record({
  kind: fc.constantFrom("buy", "sell"),
  amount: tradeAmountArb,
});

function effectiveK(curve: PumpCurveState): bigint {
  const effective = effectiveCpmm(curve);
  return effective.quoteReserve * effective.baseReserve;
}

function applyTrade(curve: PumpCurveState, trade: Trade): PumpCurveState {
  const result =
    trade.kind === "buy"
      ? pumpCurveBuy(curve, trade.amount, 0n)
      : pumpCurveSell(curve, trade.amount, 0n);
  // A trade only fails here on graduation or insufficient supply (minOut of
  // 0 always clears slippage); either way the unchanged state is correct.
  return result.state;
}

describe("pump curve (properties)", () => {
  it("the effective k never decreases, and real base sold never reaches the virtual supply", () => {
    fc.assert(
      fc.property(
        reserveArb,
        reserveArb,
        feeBpsArb,
        // A high threshold keeps the curve un-graduated for the whole run,
        // so every trade in `trades` actually exercises the swap math.
        fc.array(tradeArb, { minLength: 0, maxLength: 20 }),
        (virtualQuote, virtualBase, feeBps, trades) => {
          let curve = createPumpCurve(virtualQuote, virtualBase, feeBps, 2n ** 96n);
          let previousK = effectiveK(curve);
          for (const trade of trades) {
            curve = applyTrade(curve, trade);
            const currentK = effectiveK(curve);
            expect(currentK >= previousK).toBe(true);
            expect(curve.realBaseSold < curve.virtualBaseReserve).toBe(true);
            previousK = currentK;
          }
        },
      ),
      { seed: 42, numRuns: 500 },
    );
  });
});
