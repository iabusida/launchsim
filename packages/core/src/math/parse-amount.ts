import { parseDecimalToBigInt } from "./parse-decimal.js";

/** Lamports per SOL: SOL has 9 decimal places on-chain. */
const LAMPORTS_PER_SOL_DECIMALS = 9;

const AMOUNT_STRING = /^(\S+)\s+(\S+)$/;

/** Units `parseAmount` accepts, mapped to their decimal places. */
const UNIT_DECIMALS: Readonly<Record<string, number>> = {
  SOL: LAMPORTS_PER_SOL_DECIMALS,
};

/**
 * Parses a scenario amount string, e.g. `"2 SOL"`, into lamports.
 *
 * @param input - A decimal amount followed by a unit, e.g. `"0.5 SOL"`.
 * @returns The amount in the unit's smallest denomination (lamports for SOL).
 * @throws {RangeError} If the format is malformed or the unit is unsupported.
 * @example
 * ```ts
 * parseAmount("2 SOL"); // 2_000_000_000n
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
