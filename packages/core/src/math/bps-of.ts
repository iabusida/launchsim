import { mulDiv } from "./mul-div.js";

/** One basis point is 1/10,000 (0.01%); this is the denominator for all bps math. */
const BPS_DENOMINATOR = 10_000n;

/**
 * Computes `amount * bps / 10_000`, rounded down (docs/08: floor outputs).
 *
 * @param amount - The base quantity, in its smallest unit. Must be non-negative.
 * @param bps - The share to take, in basis points (500 = 5%). Must be non-negative.
 * @returns The share of `amount` corresponding to `bps`, floored.
 * @throws {RangeError} If `amount` or `bps` is negative (delegated to {@link mulDiv}).
 * @example
 * ```ts
 * bpsOf(1_000_000n, 500n); // 50_000n (5% of 1,000,000)
 * ```
 */
export function bpsOf(amount: bigint, bps: bigint): bigint {
  // No non-negative check here: mulDiv already validates both factors, and
  // duplicating it left untestable mutants (docs/07) with nothing behavioral
  // to distinguish them from mulDiv's own guard.
  return mulDiv(amount, bps, BPS_DENOMINATOR);
}
