import { describe, it, expect } from "vitest";
import { parseDuration } from "./parse-duration.js";

describe("parseDuration", () => {
  it("converts hours to slots", () => {
    expect(parseDuration("6h", 400)).toBe(54_000);
  });

  it("trims surrounding whitespace", () => {
    expect(parseDuration("  6h  ", 400)).toBe(54_000);
  });

  it("converts minutes to slots", () => {
    expect(parseDuration("1m", 400)).toBe(150);
  });

  it("converts days to slots", () => {
    expect(parseDuration("1d", 400)).toBe(216_000);
  });

  it("converts seconds to slots", () => {
    expect(parseDuration("30s", 400)).toBe(75);
  });

  it("matches the 48h scenario duration used throughout the docs", () => {
    expect(parseDuration("48h", 400)).toBe(432_000);
  });

  it("rounds up when the duration does not divide evenly into slots", () => {
    expect(parseDuration("1s", 300)).toBe(4); // 1000ms / 300ms = 3.33 -> 4 slots
  });

  it("throws on an unsupported unit", () => {
    expect(() => parseDuration("6x", 400)).toThrow(/invalid duration/);
  });

  it("throws on a malformed number", () => {
    expect(() => parseDuration("abch", 400)).toThrow(/invalid duration/);
  });

  it("throws when the value has more precision than parseDuration allows", () => {
    expect(() => parseDuration("1.1234567h", 400)).toThrow(/invalid duration/);
  });

  it("throws on leading content before the value", () => {
    expect(() => parseDuration("x6h", 400)).toThrow(/invalid duration/);
  });

  it("throws on trailing content after the unit", () => {
    expect(() => parseDuration("6h extra", 400)).toThrow(/invalid duration/);
  });

  it("throws when slotMs is zero", () => {
    expect(() => parseDuration("6h", 0)).toThrow(/slotMs must be positive/);
  });

  it("throws when slotMs is negative", () => {
    expect(() => parseDuration("6h", -400)).toThrow(/slotMs must be positive/);
  });

  it("throws when slotMs is not a safe integer", () => {
    expect(() => parseDuration("6h", 1.5)).toThrow(/slotMs must be a safe integer/);
  });

  it("throws when the resulting slot count exceeds Number.MAX_SAFE_INTEGER", () => {
    expect(() => parseDuration("1000000000000000000000d", 400)).toThrow(
      /exceeds Number.MAX_SAFE_INTEGER/,
    );
  });

  it("allows a slot count of exactly Number.MAX_SAFE_INTEGER (the bound is inclusive)", () => {
    expect(parseDuration("9007199254740991s", 1000)).toBe(Number.MAX_SAFE_INTEGER);
  });
});
