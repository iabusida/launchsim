/**
 * Divides two non-negative bigints, rounding up.
 *
 * @param numerator - The dividend. Must be non-negative.
 * @param denominator - The divisor. Must be non-negative and non-zero.
 * @returns The quotient, rounded away from zero toward positive infinity.
 * @example
 * ```ts
 * ceilDiv(11n, 5n); // 3n
 * ```
 */
export function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  if (numerator < 0n || denominator < 0n) {
    throw new RangeError("ceilDiv: inputs must be non-negative");
  }
  if (denominator === 0n) {
    throw new RangeError("ceilDiv: division by zero");
  }
  return (numerator + denominator - 1n) / denominator;
}
