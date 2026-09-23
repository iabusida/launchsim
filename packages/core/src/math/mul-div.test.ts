import { describe, it, expect } from "vitest";
import { mulDiv } from "./mul-div.js";

describe("mulDiv", () => {
  it("returns the exact result when divisible", () => {
    expect(mulDiv(4n, 5n, 2n)).toBe(10n);
  });

  it("rounds down when there is a remainder", () => {
    expect(mulDiv(5n, 5n, 3n)).toBe(8n);
  });

  it("returns 0 when either factor is zero", () => {
    expect(mulDiv(0n, 5n, 3n)).toBe(0n);
  });

  it("throws on a zero denominator", () => {
    expect(() => mulDiv(1n, 1n, 0n)).toThrow(/division by zero/);
  });

  it("throws on a negative first factor", () => {
    expect(() => mulDiv(-1n, 1n, 1n)).toThrow(/non-negative/);
  });

  it("throws on a negative second factor", () => {
    expect(() => mulDiv(1n, -1n, 1n)).toThrow(/non-negative/);
  });

  it("throws on a negative denominator", () => {
    expect(() => mulDiv(1n, 1n, -1n)).toThrow(/non-negative/);
  });
});
