import { bpsOf, mulDiv } from "@launchsim/core";

/**
 * A constant-product (x*y=k) pool's state: quote (SOL, lamports) against
 * base (token base units), plus an accumulated, separately-withdrawable
 * fee balance (docs/02: "trading fees accrue in quote").
 */
export interface CpmmState {
  readonly quoteReserve: bigint;
  readonly baseReserve: bigint;
  readonly feeBps: bigint;
  readonly quoteFeesCollected: bigint;
}

/** The result of a (non-mutating) swap quote: what a trade would produce. */
export interface CpmmQuote {
  readonly amountOut: bigint;
  readonly feeAmount: bigint;
}

/**
 * Creates a {@link CpmmState} from initial reserves and a trading fee.
 *
 * @param quoteReserve - Initial quote (lamports). Must be positive.
 * @param baseReserve - Initial base (token base units). Must be positive.
 * @param feeBps - Trading fee taken from every swap, in basis points. Must be non-negative.
 * @example
 * ```ts
 * createCpmm(100_000_000_000n, 1_000_000_000_000n, 100n); // 100 SOL / 1e12 base, 1% fee
 * ```
 */
export function createCpmm(quoteReserve: bigint, baseReserve: bigint, feeBps: bigint): CpmmState {
  if (quoteReserve <= 0n) {
    throw new RangeError("createCpmm: quoteReserve must be positive");
  }
  if (baseReserve <= 0n) {
    throw new RangeError("createCpmm: baseReserve must be positive");
  }
  if (feeBps < 0n) {
    throw new RangeError("createCpmm: feeBps must be non-negative");
  }
  return { quoteReserve, baseReserve, feeBps, quoteFeesCollected: 0n };
}

/**
 * Quotes buying base with `quoteIn`, without mutating `pool`.
 *
 * The fee is taken from `quoteIn` first; only the remainder is swapped
 * through the constant-product curve, floored (docs/08: round: pool-favoring).
 *
 * @param pool - The pool to quote against.
 * @param quoteIn - The amount of quote to spend. Must be non-negative; a
 *   zero `quoteIn` is a valid, trivial quote of zero (docs/06: rejecting
 *   zero-amount *trades* is `cpmmBuy`'s job, not this pure quote's).
 * @throws {RangeError} If `quoteIn` is negative.
 */
export function cpmmQuoteBuy(pool: CpmmState, quoteIn: bigint): CpmmQuote {
  if (quoteIn < 0n) {
    throw new RangeError("cpmmQuoteBuy: quoteIn must be non-negative");
  }
  const feeAmount = bpsOf(quoteIn, pool.feeBps);
  const quoteInAfterFee = quoteIn - feeAmount;
  // round: pool-favoring -- mulDiv floors, so the trader never receives more
  // than the curve exactly allows.
  const amountOut = mulDiv(quoteInAfterFee, pool.baseReserve, pool.quoteReserve + quoteInAfterFee);
  return { amountOut, feeAmount };
}

/**
 * Quotes selling `baseIn` for quote, without mutating `pool`.
 *
 * The raw quote proceeds are computed through the constant-product curve
 * first, then the fee is taken from that output (docs/02: fees always
 * accrue in quote, regardless of trade direction).
 *
 * @param pool - The pool to quote against.
 * @param baseIn - The amount of base to sell. Must be non-negative; a zero
 *   `baseIn` is a valid, trivial quote of zero (docs/06: rejecting
 *   zero-amount *trades* is `cpmmSell`'s job, not this pure quote's).
 * @throws {RangeError} If `baseIn` is negative.
 */
export function cpmmQuoteSell(pool: CpmmState, baseIn: bigint): CpmmQuote {
  if (baseIn < 0n) {
    throw new RangeError("cpmmQuoteSell: baseIn must be non-negative");
  }
  // round: pool-favoring -- floored, same reasoning as cpmmQuoteBuy.
  const rawQuoteOut = mulDiv(baseIn, pool.quoteReserve, pool.baseReserve + baseIn);
  const feeAmount = bpsOf(rawQuoteOut, pool.feeBps);
  return { amountOut: rawQuoteOut - feeAmount, feeAmount };
}
