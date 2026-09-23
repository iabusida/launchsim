import { describe, it, expect } from "vitest";
import { parseDecimalToBigInt } from "./parse-decimal.js";

describe("parseDecimalToBigInt", () => {
  it("scales a whole number by 10^decimals", () => {
    expect(parseDecimalToBigInt("2", 9)).toBe(2_000_000_000n);
  });

  it("scales a decimal number by 10^decimals", () => {
    expect(parseDecimalToBigInt("2.5", 9)).toBe(2_500_000_000n);
  });

  it("preserves the smallest representable unit", () => {
    expect(parseDecimalToBigInt("0.000000001", 9)).toBe(1n);
  });

  it("throws when the input has more precision than decimals allows", () => {
    expect(() => parseDecimalToBigInt("2.5000000001", 9)).toThrow(/precision/);
  });

  it("throws on a non-numeric string", () => {
    expect(() => parseDecimalToBigInt("abc", 9)).toThrow(/invalid/);
  });

  it("throws on a negative string", () => {
    expect(() => parseDecimalToBigInt("-1", 9)).toThrow(/invalid/);
  });

  it("throws on an empty string", () => {
    expect(() => parseDecimalToBigInt("", 9)).toThrow(/invalid/);
  });

  it("supports zero decimal places", () => {
    expect(parseDecimalToBigInt("5", 0)).toBe(5n);
  });

  it("throws on trailing content after a valid decimal", () => {
    expect(() => parseDecimalToBigInt("2x", 9)).toThrow(/invalid/);
  });
});
