import { describe, it, expect } from "vitest";
import { parseAmount } from "./parse-amount.js";

describe("parseAmount", () => {
  it("converts a whole MON amount to wei", () => {
    expect(parseAmount("2 MON")).toBe(2_000_000_000_000_000_000n);
  });

  it("trims surrounding whitespace", () => {
    expect(parseAmount("  2 MON  ")).toBe(2_000_000_000_000_000_000n);
  });

  it("converts a fractional MON amount to wei", () => {
    expect(parseAmount("0.5 MON")).toBe(500_000_000_000_000_000n);
  });

  it("preserves the smallest MON unit, one wei", () => {
    expect(parseAmount("0.000000000000000001 MON")).toBe(1n);
  });

  it("throws on an unsupported unit", () => {
    expect(() => parseAmount("2 USDC")).toThrow(/unsupported unit/);
  });

  it("throws when the unit is missing", () => {
    expect(() => parseAmount("2")).toThrow(/invalid amount/);
  });

  it("throws on a malformed number", () => {
    expect(() => parseAmount("abc MON")).toThrow(/invalid amount/);
  });

  it("throws on trailing content after the unit", () => {
    expect(() => parseAmount("2 MON extra")).toThrow(/invalid amount/);
  });

  it("accepts more than one space between the value and the unit", () => {
    expect(parseAmount("2  MON")).toBe(2_000_000_000_000_000_000n);
  });
});
