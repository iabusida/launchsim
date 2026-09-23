import { ceilDiv } from "./ceil-div.js";
import { parseDecimalToBigInt } from "./parse-decimal.js";

/** Numeric precision `parseDuration` accepts for the value part, e.g. "1.5h". */
const DURATION_VALUE_DECIMALS = 6;
const DURATION_VALUE_SCALE = 10n ** BigInt(DURATION_VALUE_DECIMALS);

const DURATION_STRING = /^([\d.]+)([a-zA-Z]+)$/;

/** Milliseconds per duration unit. */
const MS_PER_UNIT: Readonly<Record<string, bigint>> = {
  s: 1_000n,
  m: 60_000n,
  h: 3_600_000n,
  d: 86_400_000n,
};

/**
 * Parses a scenario duration string, e.g. `"6h"`, into a slot count.
 *
 * Rounds up (docs/01: durations must not under-run what was asked for): a
 * duration that does not divide evenly into `slotMs` still runs the full
 * requested time, spilling into one extra slot. The intermediate
 * millisecond math is exact `bigint` arithmetic; only the final slot count
 * -- a safe integer per docs/08 -- is returned as `number`.
 *
 * @param input - A decimal value followed by a unit: `s`, `m`, `h`, or `d`.
 * @param slotMs - The nominal slot length in milliseconds. Must be a positive safe integer.
 * @returns The duration expressed as a whole number of slots.
 * @throws {RangeError} If the format is malformed, the unit is unsupported,
 *   `slotMs` is not a positive safe integer, or the resulting slot count
 *   would exceed `Number.MAX_SAFE_INTEGER`.
 * @example
 * ```ts
 * parseDuration("6h", 400); // 54_000
 * ```
 */
export function parseDuration(input: string, slotMs: number): number {
  if (!Number.isSafeInteger(slotMs)) {
    throw new RangeError("parseDuration: slotMs must be a safe integer");
  }
  if (slotMs <= 0) {
    throw new RangeError("parseDuration: slotMs must be positive");
  }
  const match = DURATION_STRING.exec(input.trim());
  if (!match) {
    throw new RangeError(`parseDuration: invalid duration "${input}"`);
  }
  const [, value = "", unit = ""] = match;
  const msPerUnit = MS_PER_UNIT[unit];
  if (msPerUnit === undefined) {
    throw new RangeError(`parseDuration: invalid duration "${input}"`);
  }
  let scaledValue: bigint;
  try {
    scaledValue = parseDecimalToBigInt(value, DURATION_VALUE_DECIMALS);
  } catch {
    throw new RangeError(`parseDuration: invalid duration "${input}"`);
  }
  const totalMs = ceilDiv(scaledValue * msPerUnit, DURATION_VALUE_SCALE);
  const slots = ceilDiv(totalMs, BigInt(slotMs));
  if (slots > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError(`parseDuration: "${input}" exceeds Number.MAX_SAFE_INTEGER slots`);
  }
  return Number(slots);
}
