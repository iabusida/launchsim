import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { mulDiv } from "./mul-div.js";

const nonNegativeBigInt = fc.bigInt({ min: 0n, max: 2n ** 128n });
const positiveBigInt = fc.bigInt({ min: 1n, max: 2n ** 128n });

describe("mulDiv (properties)", () => {
  it("is commutative in its two factors", () => {
    fc.assert(
      fc.property(nonNegativeBigInt, nonNegativeBigInt, positiveBigInt, (a, b, denominator) => {
        expect(mulDiv(a, b, denominator)).toBe(mulDiv(b, a, denominator));
      }),
      { seed: 42, numRuns: 500 },
    );
  });

  it("floors: result * denominator <= a * b < (result + 1) * denominator", () => {
    fc.assert(
      fc.property(nonNegativeBigInt, nonNegativeBigInt, positiveBigInt, (a, b, denominator) => {
        const result = mulDiv(a, b, denominator);
        const product = a * b;
        expect(result * denominator <= product).toBe(true);
        expect(product < (result + 1n) * denominator).toBe(true);
      }),
      { seed: 42, numRuns: 500 },
    );
  });
});
