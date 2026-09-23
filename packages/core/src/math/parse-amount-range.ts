import { parseAmount } from "./parse-amount.js";

const AMOUNT_RANGE_STRING = /^([\d.]+)(?:-([\d.]+))?\s+(\S+)$/;

/** An inclusive amount range in base units, sampled by the seeded `Rng` (docs/02). */
export interface AmountRange {
  readonly min: bigint;
  readonly max: bigint;
}

/**
 * Parses a scenario amount or range string, e.g. `"2 MON"` or `"0.1-1 MON"`,
 * into an inclusive {@link AmountRange} in base units. A single amount is a
 * degenerate range (`min === max`).
 *
 * @throws {RangeError} If the format is malformed, the unit is unsupported,
 *   or `min` exceeds `max`.
 * @example
 * ```ts
 * parseAmountRange("0.1-1 MON"); // { min: 100_000_000_000_000_000n, max: 1_000_000_000_000_000_000n }
 * ```
 */
export function parseAmountRange(input: string): AmountRange {
  const match = AMOUNT_RANGE_STRING.exec(input.trim());
  if (!match) {
    throw new RangeError(`parseAmountRange: invalid amount range "${input}"`);
  }
  const [, minValue = "", maxValue, unit = ""] = match;
  const min = parseAmount(`${minValue} ${unit}`);
  const max = parseAmount(`${maxValue ?? minValue} ${unit}`);
  if (min > max) {
    throw new RangeError(`parseAmountRange: min must not exceed max in "${input}"`);
  }
  return { min, max };
}
