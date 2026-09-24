import { describe, it, expect } from "vitest";
import { quoteUnitFromAmount } from "./quote-unit.js";

describe("quoteUnitFromAmount", () => {
  it("recognizes MON as 18 decimals", () => {
    expect(quoteUnitFromAmount("180000 MON")).toEqual({ symbol: "MON", decimals: 18 });
  });

  it("throws on SOL (Solana is not a supported chain -- ADR 0006)", () => {
    expect(() => quoteUnitFromAmount("2 SOL")).toThrow(/unsupported unit/);
  });

  it("recognizes a range string's unit", () => {
    expect(quoteUnitFromAmount("0.1-1 MON")).toEqual({ symbol: "MON", decimals: 18 });
  });

  it("throws on an unrecognized unit", () => {
    expect(() => quoteUnitFromAmount("2 USDC")).toThrow(/unsupported unit/);
  });

  it("throws when no unit is present", () => {
    expect(() => quoteUnitFromAmount("2")).toThrow(/unsupported unit/);
  });

  it("throws on an empty string", () => {
    expect(() => quoteUnitFromAmount("")).toThrow(/unsupported unit/);
  });
});
