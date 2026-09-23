import { type CpmmState, cpmmQuoteBuy, cpmmQuoteSell } from "./cpmm.js";

/**
 * The result of an executed trade: a filled order, or an expected market
 * failure recorded as data rather than thrown (docs/01 error model).
 */
export type TradeOutcome =
  | { readonly ok: true; readonly amountOut: bigint; readonly feeAmount: bigint }
  | { readonly ok: false; readonly reason: "slippage exceeded" | "zero-amount" };

/** A trade's result: the pool state after it (unchanged on failure) and the outcome. */
export interface CpmmTradeResult {
  readonly state: CpmmState;
  readonly outcome: TradeOutcome;
}

/**
 * Buys base with `quoteIn`. The full `quoteIn` (fee included) enters
 * `quoteReserve`; the fee portion is additionally tracked in
 * `quoteFeesCollected` so {@link cpmmWithdrawFees} can pull it back out
 * later without disturbing the trading curve.
 *
 * @param pool - The pool to trade against.
 * @param quoteIn - The amount of quote to spend. Must be non-negative.
 * @param minBaseOut - The minimum base the trader will accept.
 * @throws {RangeError} If `quoteIn` is negative.
 */
export function cpmmBuy(pool: CpmmState, quoteIn: bigint, minBaseOut: bigint): CpmmTradeResult {
  const { amountOut, feeAmount } = cpmmQuoteBuy(pool, quoteIn);
  if (quoteIn === 0n) {
    return { state: pool, outcome: { ok: false, reason: "zero-amount" } };
  }
  if (amountOut < minBaseOut) {
    return { state: pool, outcome: { ok: false, reason: "slippage exceeded" } };
  }
  return {
    state: {
      ...pool,
      quoteReserve: pool.quoteReserve + quoteIn,
      baseReserve: pool.baseReserve - amountOut,
      quoteFeesCollected: pool.quoteFeesCollected + feeAmount,
    },
    outcome: { ok: true, amountOut, feeAmount },
  };
}

/**
 * Sells `baseIn` for quote. `baseReserve` grows by the full `baseIn`;
 * `quoteReserve` only drops by the net amount paid out, so the fee portion
 * stays in the pool, tracked in `quoteFeesCollected` (same accounting as
 * {@link cpmmBuy}, so fees always accrue in quote either direction).
 *
 * @param pool - The pool to trade against.
 * @param baseIn - The amount of base to sell. Must be non-negative.
 * @param minQuoteOut - The minimum quote the trader will accept.
 * @throws {RangeError} If `baseIn` is negative.
 */
export function cpmmSell(pool: CpmmState, baseIn: bigint, minQuoteOut: bigint): CpmmTradeResult {
  const { amountOut, feeAmount } = cpmmQuoteSell(pool, baseIn);
  if (baseIn === 0n) {
    return { state: pool, outcome: { ok: false, reason: "zero-amount" } };
  }
  if (amountOut < minQuoteOut) {
    return { state: pool, outcome: { ok: false, reason: "slippage exceeded" } };
  }
  return {
    state: {
      ...pool,
      baseReserve: pool.baseReserve + baseIn,
      quoteReserve: pool.quoteReserve - amountOut,
      quoteFeesCollected: pool.quoteFeesCollected + feeAmount,
    },
    outcome: { ok: true, amountOut, feeAmount },
  };
}
