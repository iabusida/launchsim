import { describe, it, expect } from "vitest";
import { ceilDiv } from "./ceil-div.js";

describe("ceilDiv", () => {
  it("returns the exact quotient when divisible", () => {
    expect(ceilDiv(10n, 5n)).toBe(2n);
  });

  it("rounds up when there is a remainder", () => {
    expect(ceilDiv(11n, 5n)).toBe(3n);
  });

  it("returns 0 for a zero numerator", () => {
    expect(ceilDiv(0n, 7n)).toBe(0n);
  });

  it("throws on a zero denominator", () => {
    expect(() => ceilDiv(1n, 0n)).toThrow(/division by zero/);
  });

  it("throws on negative inputs", () => {
    expect(() => ceilDiv(-1n, 2n)).toThrow(/non-negative/);
  });

  it("throws when only the denominator is negative", () => {
    expect(() => ceilDiv(1n, -2n)).toThrow(/non-negative/);
  });
});
