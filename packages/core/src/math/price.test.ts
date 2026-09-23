import { describe, it, expect } from "vitest";
import { price, comparePrice } from "./price.js";

describe("price", () => {
  it("builds a price from a numerator and denominator", () => {
    expect(price(3n, 2n)).toEqual({ num: 3n, den: 2n });
  });

  it("throws on a negative numerator", () => {
    expect(() => price(-1n, 2n)).toThrow(/non-negative/);
  });

  it("throws on a zero denominator", () => {
    expect(() => price(1n, 0n)).toThrow(/positive/);
  });

  it("throws on a negative denominator", () => {
    expect(() => price(1n, -2n)).toThrow(/positive/);
  });
});

describe("comparePrice", () => {
  it("returns 0 for equal prices with different representations", () => {
    expect(comparePrice(price(1n, 2n), price(2n, 4n))).toBe(0);
  });

  it("returns -1 when the first price is lower", () => {
    expect(comparePrice(price(1n, 4n), price(1n, 2n))).toBe(-1);
  });

  it("returns 1 when the first price is higher", () => {
    expect(comparePrice(price(1n, 2n), price(1n, 4n))).toBe(1);
  });
});
