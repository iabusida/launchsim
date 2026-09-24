const DISPLAY_DECIMALS = 2;

/** A quote asset's display unit: its ticker symbol and base-unit decimal places. */
export interface QuoteUnit {
  readonly symbol: string;
  readonly decimals: number;
}

/**
 * Formats a quote amount (in its smallest base unit, e.g. wei for MON) as
 * a decimal string, e.g. `"12.34 MON"`. Rounds down
 * (floors) rather than rounding nearest, consistent with the pool-favoring
 * rounding used everywhere else (docs/08); exact bigint arithmetic
 * throughout, no float conversion.
 *
 * @throws {RangeError} If `amount` is negative.
 */
export function formatQuoteAmount(amount: bigint, unit: QuoteUnit): string {
  if (amount < 0n) {
    throw new RangeError("formatQuoteAmount: amount must be non-negative");
  }
  const scale = 10n ** BigInt(unit.decimals);
  const centiScale = scale / 10n ** BigInt(DISPLAY_DECIMALS);
  const centi = amount / centiScale;
  const whole = centi / 100n;
  const fraction = centi % 100n;
  return `${whole.toString()}.${fraction.toString().padStart(DISPLAY_DECIMALS, "0")} ${unit.symbol}`;
}
