import { describe, it, expect } from "vitest";
import { bpsOf } from "./bps-of.js";

describe("bpsOf", () => {
  it("computes a share expressed in basis points", () => {
    expect(bpsOf(1_000_000n, 500n)).toBe(50_000n); // 5% of 1,000,000
  });

  it("rounds down when the share does not divide evenly", () => {
    expect(bpsOf(10n, 1n)).toBe(0n); // 0.01% of 10 truncates to 0
  });

  it("returns 0 for a zero amount", () => {
    expect(bpsOf(0n, 500n)).toBe(0n);
  });

  it("returns the full amount at 10_000 bps (100%)", () => {
    expect(bpsOf(1_234n, 10_000n)).toBe(1_234n);
  });

  it("allows more than 10_000 bps (callers may model >100% shares)", () => {
    expect(bpsOf(100n, 20_000n)).toBe(200n);
  });

  it("throws on a negative amount", () => {
    expect(() => bpsOf(-1n, 500n)).toThrow(/non-negative/);
  });

  it("throws on negative bps", () => {
    expect(() => bpsOf(100n, -1n)).toThrow(/non-negative/);
  });
});
