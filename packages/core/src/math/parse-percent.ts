import { parseDecimalToBigInt } from "./parse-decimal.js";

/** Basis points have 2 decimal digits of percent precision (1 bp = 0.01%). */
const BPS_DECIMALS = 2;

const PERCENT_STRING = /^(\S+)%$/;

/**
 * Parses a scenario percentage string, e.g. `"5%"`, into basis points.
 *
 * @param input - A decimal percentage ending in `%`, e.g. `"0.5%"`.
 * @returns The value in basis points (1 bp = 0.01%).
 * @throws {RangeError} If the format is malformed or has more than 2 decimal places.
 * @example
 * ```ts
 * parsePercent("5%"); // 500n
 * ```
 */
export function parsePercent(input: string): bigint {
  const match = PERCENT_STRING.exec(input.trim());
  if (!match) {
    throw new RangeError(`parsePercent: invalid percent "${input}"`);
  }
  const [, value = ""] = match;
  try {
    return parseDecimalToBigInt(value, BPS_DECIMALS);
  } catch {
    throw new RangeError(`parsePercent: invalid percent "${input}"`);
  }
}
