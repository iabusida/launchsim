const DECIMAL_STRING = /^(\d+)(?:\.(\d+))?$/;

/**
 * Parses a non-negative decimal string exactly into a bigint scaled by
 * `10^decimals`, with no floating-point conversion at any point (ADR 0003).
 *
 * Rejects input with more fractional digits than `decimals` rather than
 * silently rounding, so a typo in a scenario config fails loudly instead of
 * quietly losing precision.
 *
 * @param input - A plain decimal string, e.g. `"2.5"`. No sign, no exponent.
 * @param decimals - The number of fractional digits the unit supports.
 * @returns The value of `input`, scaled to the smallest unit, as a bigint.
 * @example
 * ```ts
 * parseDecimalToBigInt("2.5", 9); // 2_500_000_000n
 * ```
 */
export function parseDecimalToBigInt(input: string, decimals: number): bigint {
  const match = DECIMAL_STRING.exec(input);
  if (!match) {
    throw new RangeError(`parseDecimalToBigInt: invalid decimal string "${input}"`);
  }
  const [, whole = "", fraction = ""] = match;
  if (fraction.length > decimals) {
    throw new RangeError(
      `parseDecimalToBigInt: "${input}" has more precision than ${String(decimals)} decimal places`,
    );
  }
  const paddedFraction = fraction.padEnd(decimals, "0");
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(paddedFraction || "0");
}
