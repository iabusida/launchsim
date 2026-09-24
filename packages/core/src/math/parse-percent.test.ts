import { describe, it, expect } from "vitest";
import { parsePercent } from "./parse-percent.js";

describe("parsePercent", () => {
  it("converts a whole percentage to basis points", () => {
    expect(parsePercent("5%")).toBe(500n);
  });

  it("trims surrounding whitespace", () => {
    expect(parsePercent("  5%  ")).toBe(500n);
  });

  it("converts a fractional percentage to basis points", () => {
    expect(parsePercent("0.5%")).toBe(50n);
  });

  it("converts 100% to 10_000 basis points", () => {
    expect(parsePercent("100%")).toBe(10_000n);
  });

  it("supports the finest basis-point precision, two decimal places", () => {
    expect(parsePercent("12.34%")).toBe(1_234n);
  });

  it("throws when the % suffix is missing", () => {
    expect(() => parsePercent("5")).toThrow(/invalid percent/);
  });

  it("throws on a malformed number", () => {
    expect(() => parsePercent("abc%")).toThrow(/invalid percent/);
  });

  it("throws when given more precision than a basis point allows", () => {
    expect(() => parsePercent("5.123%")).toThrow(/invalid percent/);
  });

  it("throws on trailing content after the %", () => {
    expect(() => parsePercent("5% extra")).toThrow(/invalid percent/);
  });

  it("throws on content before the value that isn't part of it (an internal space `.trim()` won't remove)", () => {
    // `\S+` would otherwise absorb any non-whitespace prefix as part of
    // its own match regardless of the `^` anchor, so only a genuinely
    // unmatched internal separator can distinguish an anchored regex from
    // an unanchored one here.
    expect(() => parsePercent("a 5%")).toThrow(/invalid percent/);
  });
});
