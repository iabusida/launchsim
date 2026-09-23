import { describe, it, expect } from "vitest";
import { formatLamports } from "./format-lamports.js";

describe("formatLamports", () => {
  it("formats a whole SOL amount", () => {
    expect(formatLamports(2_000_000_000n)).toBe("2.00 SOL");
  });

  it("formats a fractional amount, rounded to 2 decimals", () => {
    expect(formatLamports(12_340_000_000n)).toBe("12.34 SOL");
  });

  it("rounds down (floors) a value that isn't exact at 2 decimals", () => {
    expect(formatLamports(12_349_999_999n)).toBe("12.34 SOL");
  });

  it("formats zero", () => {
    expect(formatLamports(0n)).toBe("0.00 SOL");
  });

  it("formats a sub-cent amount as 0.00 SOL", () => {
    expect(formatLamports(1n)).toBe("0.00 SOL");
  });

  it("throws on a negative amount", () => {
    expect(() => formatLamports(-1n)).toThrow(/non-negative/);
  });
});
