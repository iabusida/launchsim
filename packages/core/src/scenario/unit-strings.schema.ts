import { z } from "zod";

// These patterns mirror what math/parse-amount.ts, parse-percent.ts, and
// parse-duration.ts accept. Validating the shape here means a scenario with
// a typo'd unit fails at the zod boundary (docs/08), before any engine code
// ever tries to parse it. Actually converting a valid string to a bigint
// still happens via the dedicated parse-*.ts helpers, not here (docs/08:
// "Inside core, types are trusted" -- the string is the trusted value).

/** A single amount, e.g. `"2 SOL"` or `"0.5 SOL"` (see `math/parse-amount.ts`). */
export const AmountStringSchema = z
  .string()
  .regex(/^[\d.]+\s+SOL$/, 'expected an amount like "2 SOL"');

/**
 * A single amount or an inclusive range, e.g. `"2 SOL"` or `"0.1-1 SOL"`.
 * A range is sampled with the seeded `Rng` (docs/02); that sampling is an
 * engine concern (M2), not this schema's.
 */
export const AmountRangeStringSchema = z
  .string()
  .regex(/^[\d.]+(-[\d.]+)?\s+SOL$/, 'expected an amount like "2 SOL" or a range like "0.1-1 SOL"');

/**
 * A plain decimal string with no unit, e.g. `"1073000000000000"`, used for
 * base-unit quantities (token supply, virtual/real base reserves) that are
 * already in their smallest denomination (see `math/parse-decimal.ts`).
 */
export const BaseUnitsStringSchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'expected a plain decimal string like "1000000"');

/** A percentage, e.g. `"5%"` or `"0.5%"` (see `math/parse-percent.ts`). */
export const PercentStringSchema = z.string().regex(/^[\d.]+%$/, 'expected a percentage like "5%"');

/** A relative duration, e.g. `"6h"` or `"90m"` (see `math/parse-duration.ts`). */
export const DurationStringSchema = z
  .string()
  .regex(/^[\d.]+(s|m|h|d)$/, 'expected a duration like "6h"');

/**
 * A point in time: a relative duration, an absolute slot (`"slot:0"`), or
 * an absolute hour (`"hour:31"`) (docs/02). Resolving `slot:`/`hour:` forms
 * against the engine's clock is an M2 concern, not this schema's.
 */
export const SlotOrDurationStringSchema = z
  .string()
  .regex(/^(slot:\d+|hour:\d+|[\d.]+(s|m|h|d))$/, 'expected "6h", "slot:0", or "hour:31"');
