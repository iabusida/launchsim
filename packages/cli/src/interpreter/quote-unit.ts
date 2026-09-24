import type { QuoteUnit } from "@launchsim/report";

/**
 * Quote units the interpreter recognizes, mirroring `core/math/parse-amount.ts`'s
 * `UNIT_DECIMALS` (docs/06). Kept separate rather than imported: `core` has
 * no public export of its internal unit table, and this is a report-display
 * concern, not an engine one.
 */
const QUOTE_UNITS: Readonly<Record<string, QuoteUnit>> = {
  MON: { symbol: "MON", decimals: 18 },
};

const TRAILING_UNIT = /(\S+)$/;

/**
 * Extracts the {@link QuoteUnit} a scenario uses for its report display, from
 * any of its amount strings (e.g. the market's `virtualQuote`/`quote`
 * field) -- a scenario uses one quote asset throughout, so any amount
 * string carries the same unit.
 *
 * @throws {RangeError} If the string carries no recognized unit suffix.
 */
export function quoteUnitFromAmount(amount: string): QuoteUnit {
  const match = TRAILING_UNIT.exec(amount.trim());
  const symbol = match?.[1] ?? "";
  const unit = QUOTE_UNITS[symbol];
  if (!unit) {
    throw new RangeError(`quoteUnitFromAmount: unsupported unit in "${amount}"`);
  }
  return unit;
}
