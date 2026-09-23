/**
 * Multiplies two non-negative bigints then divides by a third, rounding down.
 *
 * Computing `(a * b) / denominator` in one step (rather than `a / denominator`
 * then `* b`, or vice versa) avoids the intermediate rounding loss that would
 * otherwise compound through reserve and fee math.
 *
 * @param a - First factor. Must be non-negative.
 * @param b - Second factor. Must be non-negative.
 * @param denominator - The divisor. Must be non-negative and non-zero.
 * @returns `floor((a * b) / denominator)`.
 * @example
 * ```ts
 * mulDiv(5n, 5n, 3n); // 8n
 * ```
 */
export function mulDiv(a: bigint, b: bigint, denominator: bigint): bigint {
  if (a < 0n || b < 0n || denominator < 0n) {
    throw new RangeError("mulDiv: inputs must be non-negative");
  }
  if (denominator === 0n) {
    throw new RangeError("mulDiv: division by zero");
  }
  return (a * b) / denominator;
}
