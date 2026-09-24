import { describe, it, expect } from "vitest";
import { formatQuoteAmount } from "./format-quote-amount.js";

const MON = { symbol: "MON", decimals: 18 };
// A second unit with different decimals, to prove formatQuoteAmount is
// generic over any QuoteUnit, not just MON's 18 decimal places.
const USDC = { symbol: "USDC", decimals: 6 };

describe("formatQuoteAmount", () => {
  it("formats a whole MON amount", () => {
    expect(formatQuoteAmount(2_000_000_000_000_000_000n, MON)).toBe("2.00 MON");
  });

  it("formats a fractional MON amount, rounded to 2 decimals", () => {
    expect(formatQuoteAmount(12_340_000_000_000_000_000n, MON)).toBe("12.34 MON");
  });

  it("rounds down (floors) a MON value that isn't exact at 2 decimals", () => {
    expect(formatQuoteAmount(12_349_999_999_999_999_999n, MON)).toBe("12.34 MON");
  });

  it("formats zero MON", () => {
    expect(formatQuoteAmount(0n, MON)).toBe("0.00 MON");
  });

  it("formats a sub-cent MON amount as 0.00 MON", () => {
    expect(formatQuoteAmount(1n, MON)).toBe("0.00 MON");
  });

  it("throws on a negative MON amount", () => {
    expect(() => formatQuoteAmount(-1n, MON)).toThrow(/non-negative/);
  });

  it("formats a whole amount in a unit with different decimals than MON", () => {
    expect(formatQuoteAmount(2_000_000n, USDC)).toBe("2.00 USDC");
  });

  it("formats a fractional amount, rounded to 2 decimals, in a unit with different decimals than MON", () => {
    expect(formatQuoteAmount(12_340_000n, USDC)).toBe("12.34 USDC");
  });

  it("rounds down (floors) a value that isn't exact at 2 decimals, in a unit with different decimals than MON", () => {
    expect(formatQuoteAmount(12_349_999n, USDC)).toBe("12.34 USDC");
  });
});
