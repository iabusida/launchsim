import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { price, comparePrice } from "./price.js";

const priceArb = fc
  .tuple(fc.bigInt({ min: 0n, max: 2n ** 64n }), fc.bigInt({ min: 1n, max: 2n ** 64n }))
  .map(([num, den]) => price(num, den));

describe("comparePrice (properties)", () => {
  it("is reflexive: a price always compares equal to itself", () => {
    fc.assert(
      fc.property(priceArb, (p) => {
        expect(comparePrice(p, p)).toBe(0);
      }),
      { seed: 42, numRuns: 500 },
    );
  });

  it("is antisymmetric: swapping the operands negates the result", () => {
    fc.assert(
      fc.property(priceArb, priceArb, (a, b) => {
        expect(comparePrice(a, b)).toBe(-comparePrice(b, a));
      }),
      { seed: 42, numRuns: 500 },
    );
  });

  it("is scale-invariant: multiplying num and den by the same factor changes nothing", () => {
    fc.assert(
      fc.property(priceArb, fc.bigInt({ min: 1n, max: 2n ** 32n }), (p, k) => {
        const scaled = price(p.num * k, p.den * k);
        expect(comparePrice(p, scaled)).toBe(0);
      }),
      { seed: 42, numRuns: 500 },
    );
  });
});
