import { describe, it, expect } from "vitest";
import { formatQuoteAmount } from "./format-quote-amount.js";

const MON = { symbol: "MON", decimals: 18 };
const SOL = { symbol: "SOL", decimals: 9 };

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

  it("formats a whole SOL amount (deferred Solana path)", () => {
    expect(formatQuoteAmount(2_000_000_000n, SOL)).toBe("2.00 SOL");
  });

  it("formats a fractional SOL amount, rounded to 2 decimals (deferred Solana path)", () => {
    expect(formatQuoteAmount(12_340_000_000n, SOL)).toBe("12.34 SOL");
  });

  it("rounds down (floors) a SOL value that isn't exact at 2 decimals (deferred Solana path)", () => {
    expect(formatQuoteAmount(12_349_999_999n, SOL)).toBe("12.34 SOL");
  });
});
