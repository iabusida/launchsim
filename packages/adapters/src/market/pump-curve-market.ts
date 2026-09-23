import type { Market } from "@launchsim/core";
import {
  createPumpCurve,
  effectiveCpmm,
  pumpCurveQuoteBuy,
  pumpCurveQuoteSell,
} from "../math/pump-curve.js";
import { pumpCurveBuy, pumpCurveSell } from "../math/pump-curve-trade.js";
import { pumpCurveBurnFromPool, pumpCurveWithdrawFees } from "../math/pump-curve-mechanics.js";

/** The `math/pump-curve` adapter's config: virtual reserves, a fee, and a graduation threshold. */
export interface PumpCurveMarketConfig {
  readonly virtualQuoteReserve: bigint;
  readonly virtualBaseReserve: bigint;
  readonly feeBps: bigint;
  readonly graduationQuoteThreshold: bigint;
}

/**
 * Wraps the pure pump-curve math (`math/pump-curve.ts`) behind the
 * stateful {@link Market} interface (docs/01, docs/06). `state()` reports
 * the curve's *effective* reserves (virtual + real), since that is what
 * determines price -- not the raw real reserve alone.
 *
 * Graduating to a CPMM pool (`pumpCurveGraduate`) is a mechanic/engine
 * concern, not this wrapper's: once graduated, further buys/sells fail
 * with `"curve graduated"` until the engine swaps in a `createCpmmMarket`.
 *
 * @example
 * ```ts
 * const market = createPumpCurveMarket({
 *   virtualQuoteReserve: 30_000_000_000n,
 *   virtualBaseReserve: 1_073_000_000_000_000n,
 *   feeBps: 100n,
 *   graduationQuoteThreshold: 85_000_000_000n,
 * });
 * ```
 */
export function createPumpCurveMarket(config: PumpCurveMarketConfig): Market {
  let curve = createPumpCurve(
    config.virtualQuoteReserve,
    config.virtualBaseReserve,
    config.feeBps,
    config.graduationQuoteThreshold,
  );
  return {
    kind: "math/pump-curve",
    state() {
      const effective = effectiveCpmm(curve);
      return {
        quoteReserve: effective.quoteReserve,
        baseReserve: effective.baseReserve,
        quoteFeesCollected: curve.quoteFeesCollected,
      };
    },
    quoteBuy(quoteIn) {
      return pumpCurveQuoteBuy(curve, quoteIn);
    },
    quoteSell(baseIn) {
      return pumpCurveQuoteSell(curve, baseIn);
    },
    buy(order) {
      const result = pumpCurveBuy(curve, order.quoteIn, order.minBaseOut);
      curve = result.state;
      return result.outcome;
    },
    sell(order) {
      const result = pumpCurveSell(curve, order.baseIn, order.minQuoteOut);
      curve = result.state;
      return result.outcome;
    },
    burnFromPool(baseAmount) {
      curve = pumpCurveBurnFromPool(curve, baseAmount);
    },
    withdrawFees() {
      const withdrawal = pumpCurveWithdrawFees(curve);
      curve = withdrawal.state;
      return withdrawal.amount;
    },
  };
}
