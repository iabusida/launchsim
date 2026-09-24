import { describe, it, expect } from "vitest";
import { parseAmountRange } from "./parse-amount-range.js";

describe("parseAmountRange", () => {
  it("parses a single amount as a degenerate range (min === max)", () => {
    expect(parseAmountRange("2 MON")).toEqual({ min: 2_000_000_000_000_000_000n, max: 2_000_000_000_000_000_000n });
  });

  it("parses a range into min and max", () => {
    expect(parseAmountRange("0.1-1 MON")).toEqual({
      min: 100_000_000_000_000_000n,
      max: 1_000_000_000_000_000_000n,
    });
  });

  it("accepts more than one space before the unit", () => {
    expect(parseAmountRange("0.1-1  MON")).toEqual({
      min: 100_000_000_000_000_000n,
      max: 1_000_000_000_000_000_000n,
    });
  });

  it("parses a SOL range (deferred Solana path)", () => {
    expect(parseAmountRange("1-2 SOL")).toEqual({ min: 1_000_000_000n, max: 2_000_000_000n });
  });

  it("throws when the range is malformed", () => {
    expect(() => parseAmountRange("0.1- MON")).toThrow(/invalid amount range/);
  });

  it("throws when the unit is missing", () => {
    expect(() => parseAmountRange("0.1-1")).toThrow(/invalid amount range/);
  });

  it("throws on leading content before the value", () => {
    expect(() => parseAmountRange("x2 MON")).toThrow(/invalid amount range/);
  });

  it("throws on trailing content after the unit", () => {
    expect(() => parseAmountRange("2 MON extra")).toThrow(/invalid amount range/);
  });

  it("trims leading and trailing whitespace", () => {
    expect(parseAmountRange("  2 MON  ")).toEqual({
      min: 2_000_000_000_000_000_000n,
      max: 2_000_000_000_000_000_000n,
    });
  });

  it("throws on an unsupported unit", () => {
    expect(() => parseAmountRange("0.1-1 USDC")).toThrow(/unsupported unit/);
  });

  it("throws when min is greater than max", () => {
    expect(() => parseAmountRange("1-0.5 MON")).toThrow(/min must not exceed max/);
  });
});
