import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseDecimalToBigInt } from "./parse-decimal.js";

/** Formats a scaled bigint back into the decimal string parseDecimalToBigInt expects. */
function format(value: bigint, decimals: number): string {
  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  const fraction = value % scale;
  return decimals === 0
    ? whole.toString()
    : `${whole.toString()}.${fraction.toString().padStart(decimals, "0")}`;
}

describe("parseDecimalToBigInt (properties)", () => {
  it("round-trips through format() for any non-negative value and decimals", () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: 10n ** 30n }),
        fc.integer({ min: 0, max: 18 }),
        (value, decimals) => {
          expect(parseDecimalToBigInt(format(value, decimals), decimals)).toBe(value);
        },
      ),
      { seed: 42, numRuns: 500 },
    );
  });
});
