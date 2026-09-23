import {
  type PumpCurveState,
  isPumpCurveGraduated,
  pumpCurveQuoteBuy,
  pumpCurveQuoteSell,
} from "./pump-curve.js";

/**
 * The result of an executed curve trade: a filled order, or an expected
 * market failure recorded as data (docs/01 error model).
 */
export type PumpCurveTradeOutcome =
  | { readonly ok: true; readonly amountOut: bigint; readonly feeAmount: bigint }
  | {
      readonly ok: false;
      readonly reason:
        "slippage exceeded" | "curve graduated" | "insufficient curve supply" | "zero-amount";
    };

/** A curve trade's result: the state after it (unchanged on failure) and the outcome. */
export interface PumpCurveTradeResult {
  readonly state: PumpCurveState;
  readonly outcome: PumpCurveTradeOutcome;
}

/**
 * Buys base with `quoteIn` against the curve's effective reserves, then
 * folds the trade into `realQuoteReserve`/`realBaseSold`/`quoteFeesCollected`.
 * Reuses {@link pumpCurveQuoteBuy} for the swap math rather than duplicating it.
 *
 * @param curve - The curve to trade against.
 * @param quoteIn - The amount of quote to spend. Must be non-negative.
 * @param minBaseOut - The minimum base the trader will accept.
 * @throws {RangeError} If `quoteIn` is negative.
 */
export function pumpCurveBuy(
  curve: PumpCurveState,
  quoteIn: bigint,
  minBaseOut: bigint,
): PumpCurveTradeResult {
  const quote = pumpCurveQuoteBuy(curve, quoteIn);
  if (quoteIn === 0n) {
    return { state: curve, outcome: { ok: false, reason: "zero-amount" } };
  }
  if (isPumpCurveGraduated(curve)) {
    return { state: curve, outcome: { ok: false, reason: "curve graduated" } };
  }
  if (quote.amountOut < minBaseOut) {
    return { state: curve, outcome: { ok: false, reason: "slippage exceeded" } };
  }
  return {
    state: {
      ...curve,
      realQuoteReserve: curve.realQuoteReserve + quoteIn,
      realBaseSold: curve.realBaseSold + quote.amountOut,
      quoteFeesCollected: curve.quoteFeesCollected + quote.feeAmount,
    },
    outcome: { ok: true, amountOut: quote.amountOut, feeAmount: quote.feeAmount },
  };
}

/**
 * Sells `baseIn` against the curve's effective reserves, then folds the
 * trade into `realQuoteReserve`/`realBaseSold`/`quoteFeesCollected`. Fails
 * with `"insufficient curve supply"` rather than letting `realBaseSold` go
 * negative, which would mean the curve had "unsold" more than it ever sold.
 *
 * @param curve - The curve to trade against.
 * @param baseIn - The amount of base to sell. Must be non-negative.
 * @param minQuoteOut - The minimum quote the trader will accept.
 * @throws {RangeError} If `baseIn` is negative.
 */
export function pumpCurveSell(
  curve: PumpCurveState,
  baseIn: bigint,
  minQuoteOut: bigint,
): PumpCurveTradeResult {
  const quote = pumpCurveQuoteSell(curve, baseIn);
  if (baseIn === 0n) {
    return { state: curve, outcome: { ok: false, reason: "zero-amount" } };
  }
  if (baseIn > curve.realBaseSold) {
    return { state: curve, outcome: { ok: false, reason: "insufficient curve supply" } };
  }
  if (quote.amountOut < minQuoteOut) {
    return { state: curve, outcome: { ok: false, reason: "slippage exceeded" } };
  }
  return {
    state: {
      ...curve,
      realQuoteReserve: curve.realQuoteReserve - quote.amountOut,
      realBaseSold: curve.realBaseSold - baseIn,
      quoteFeesCollected: curve.quoteFeesCollected + quote.feeAmount,
    },
    outcome: { ok: true, amountOut: quote.amountOut, feeAmount: quote.feeAmount },
  };
}
