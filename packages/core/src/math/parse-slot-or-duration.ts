import { parseDuration } from "./parse-duration.js";

const SLOT_STRING = /^slot:(\d+)$/;
const HOUR_STRING = /^hour:(\d+)$/;

/**
 * Parses a scenario time point (docs/02): an absolute slot (`"slot:0"`), an
 * absolute hour (`"hour:31"`), or a relative duration (`"6h"`, `"90m"`),
 * into a slot number.
 *
 * @param input - `"slot:N"`, `"hour:N"`, or a duration string.
 * @param slotMs - The nominal slot length in milliseconds.
 * @throws {RangeError} If the format is malformed or invalid.
 * @example
 * ```ts
 * parseSlotOrDuration("slot:0", 400); // 0
 * parseSlotOrDuration("hour:1", 400); // 9_000
 * parseSlotOrDuration("6h", 400); // 54_000
 * ```
 */
export function parseSlotOrDuration(input: string, slotMs: number): number {
  const trimmed = input.trim();
  const slotMatch = SLOT_STRING.exec(trimmed);
  if (slotMatch) {
    const [, digits = ""] = slotMatch;
    return Number(digits);
  }
  const hourMatch = HOUR_STRING.exec(trimmed);
  if (hourMatch) {
    const [, digits = ""] = hourMatch;
    return parseDuration(`${digits}h`, slotMs);
  }
  try {
    return parseDuration(trimmed, slotMs);
  } catch {
    throw new RangeError(`parseSlotOrDuration: invalid time point "${input}"`);
  }
}
