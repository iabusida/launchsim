import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createCpmm, cpmmQuoteBuy, type CpmmState } from "./cpmm.js";
import { cpmmBuy, cpmmSell } from "./cpmm-trade.js";

const reserveArb = fc.bigInt({ min: 1_000_000n, max: 10n ** 15n });
const feeBpsArb = fc.bigInt({ min: 0n, max: 1_000n }); // 0-10%
const tradeAmountArb = fc.bigInt({ min: 1n, max: 10n ** 12n });

interface Trade {
  readonly kind: "buy" | "sell";
  readonly amount: bigint;
}

const tradeArb: fc.Arbitrary<Trade> = fc.record({
  kind: fc.constantFrom("buy", "sell"),
  amount: tradeAmountArb,
});

function k(state: CpmmState): bigint {
  return state.quoteReserve * state.baseReserve;
}

function applyTrade(state: CpmmState, trade: Trade): CpmmState {
  const result =
    trade.kind === "buy" ? cpmmBuy(state, trade.amount, 0n) : cpmmSell(state, trade.amount, 0n);
  // minOut of 0 always fills, so every trade in this test succeeds.
  return result.outcome.ok ? result.state : state;
}

describe("cpmm (properties)", () => {
  it("k never decreases after any sequence of buys and sells", () => {
    fc.assert(
      fc.property(
        reserveArb,
        reserveArb,
        feeBpsArb,
        fc.array(tradeArb, { minLength: 0, maxLength: 20 }),
        (quoteReserve, baseReserve, feeBps, trades) => {
          let state = createCpmm(quoteReserve, baseReserve, feeBps);
          let previousK = k(state);
          for (const trade of trades) {
            state = applyTrade(state, trade);
            const currentK = k(state);
            expect(currentK >= previousK).toBe(true);
            previousK = currentK;
          }
        },
      ),
      { seed: 42, numRuns: 500 },
    );
  });

  it("buying then immediately selling the received amount never returns more quote than spent (docs/06)", () => {
    fc.assert(
      fc.property(
        reserveArb,
        reserveArb,
        feeBpsArb,
        tradeAmountArb,
        (quoteReserve, baseReserve, feeBps, quoteIn) => {
          const pool = createCpmm(quoteReserve, baseReserve, feeBps);
          const bought = cpmmBuy(pool, quoteIn, 0n);
          if (!bought.outcome.ok) {
            return; // quoteIn ended up rounding to a zero-amount fee edge case; nothing to round-trip
          }
          const sold = cpmmSell(bought.state, bought.outcome.amountOut, 0n);
          if (!sold.outcome.ok) {
            return; // the received amount was itself zero (dust); nothing to round-trip
          }
          expect(sold.outcome.amountOut <= quoteIn).toBe(true);
        },
      ),
      { seed: 42, numRuns: 500 },
    );
  });

  it("quoteBuy(x) and a subsequent buy(x) produce the same fill (docs/06)", () => {
    fc.assert(
      fc.property(
        reserveArb,
        reserveArb,
        feeBpsArb,
        tradeAmountArb,
        (quoteReserve, baseReserve, feeBps, quoteIn) => {
          const pool = createCpmm(quoteReserve, baseReserve, feeBps);
          const quote = cpmmQuoteBuy(pool, quoteIn);
          const traded = cpmmBuy(pool, quoteIn, 0n);
          expect(traded.outcome).toEqual({
            ok: true,
            amountOut: quote.amountOut,
            feeAmount: quote.feeAmount,
          });
        },
      ),
      { seed: 42, numRuns: 500 },
    );
  });
});
