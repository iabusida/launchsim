import { parseDecimalToBigInt } from "./parse-decimal.js";

/** Wei per MON: MON is Monad's native gas token, 18 decimal places like every EVM chain's native asset. */
const WEI_PER_MON_DECIMALS = 18;

const AMOUNT_STRING = /^(\S+)\s+(\S+)$/;

/**
 * Units `parseAmount` accepts, mapped to their decimal places. The engine
 * itself only ever sees the resulting bigint base units, never a unit
 * string.
 */
const UNIT_DECIMALS: Readonly<Record<string, number>> = {
  MON: WEI_PER_MON_DECIMALS,
};

/**
 * Parses a scenario amount string, e.g. `"2 MON"`, into the unit's
 * smallest denomination (wei for MON).
 *
 * @param input - A decimal amount followed by a unit, e.g. `"0.5 MON"`.
 * @returns The amount in the unit's smallest denomination.
 * @throws {RangeError} If the format is malformed or the unit is unsupported.
 * @example
 * ```ts
 * parseAmount("2 MON"); // 2_000_000_000_000_000_000n
 * ```
 */
export function parseAmount(input: string): bigint {
  const match = AMOUNT_STRING.exec(input.trim());
  if (!match) {
    throw new RangeError(`parseAmount: invalid amount "${input}"`);
  }
  const [, value = "", unit = ""] = match;
  const decimals = UNIT_DECIMALS[unit];
  if (decimals === undefined) {
    throw new RangeError(`parseAmount: unsupported unit "${unit}" in "${input}"`);
  }
  try {
    return parseDecimalToBigInt(value, decimals);
  } catch {
    throw new RangeError(`parseAmount: invalid amount "${input}"`);
  }
}
