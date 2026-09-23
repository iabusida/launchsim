import { describe, it, expect } from "vitest";
import { parseBaseUnitsRange } from "./parse-base-units-range.js";

describe("parseBaseUnitsRange", () => {
  it("parses a single amount as a degenerate range (min === max)", () => {
    expect(parseBaseUnitsRange("1000000")).toEqual({ min: 1_000_000n, max: 1_000_000n });
  });

  it("parses a range into min and max", () => {
    expect(parseBaseUnitsRange("100-200")).toEqual({ min: 100n, max: 200n });
  });

  it("throws when the range is malformed", () => {
    expect(() => parseBaseUnitsRange("100-")).toThrow(/invalid base units range/);
  });

  it("throws when min is greater than max", () => {
    expect(() => parseBaseUnitsRange("200-100")).toThrow(/min must not exceed max/);
  });
});
