import { parseDecimalToBigInt } from "./parse-decimal.js";
import type { AmountRange } from "./parse-amount-range.js";

const BASE_UNITS_RANGE_STRING = /^(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?$/;

/**
 * Parses a plain base-units amount or range string, e.g. `"1000000"` or
 * `"100-200"`, into an inclusive {@link AmountRange} -- no unit suffix,
 * unlike {@link parseAmountRange}, since these are already in their
 * smallest denomination (e.g. a panic-seller's token holdings, docs/02).
 *
 * @throws {RangeError} If the format is malformed or `min` exceeds `max`.
 * @example
 * ```ts
 * parseBaseUnitsRange("100-200"); // { min: 100n, max: 200n }
 * ```
 */
export function parseBaseUnitsRange(input: string): AmountRange {
  const match = BASE_UNITS_RANGE_STRING.exec(input.trim());
  if (!match) {
    throw new RangeError(`parseBaseUnitsRange: invalid base units range "${input}"`);
  }
  const [, minValue = "", maxValue] = match;
  const min = parseDecimalToBigInt(minValue, 0);
  const max = parseDecimalToBigInt(maxValue ?? minValue, 0);
  if (min > max) {
    throw new RangeError(`parseBaseUnitsRange: min must not exceed max in "${input}"`);
  }
  return { min, max };
}
