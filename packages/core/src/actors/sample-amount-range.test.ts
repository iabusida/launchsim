import { describe, it, expect } from "vitest";
import { createRng } from "../engine/rng.js";
import { sampleAmountRange } from "./sample-amount-range.js";

describe("sampleAmountRange", () => {
  it("returns min when min equals max", () => {
    const rng = createRng(42);
    expect(sampleAmountRange(rng, 100n, 100n)).toBe(100n);
  });

  it("returns a value within [min, max]", () => {
    const rng = createRng(42);
    for (let i = 0; i < 50; i++) {
      const value = sampleAmountRange(rng, 100n, 1_000n);
      expect(value >= 100n && value <= 1_000n).toBe(true);
    }
  });

  it("is deterministic for a given seed", () => {
    const a = sampleAmountRange(createRng(42), 100n, 1_000n);
    const b = sampleAmountRange(createRng(42), 100n, 1_000n);
    expect(a).toBe(b);
  });

  it("throws when max is less than min", () => {
    const rng = createRng(42);
    expect(() => sampleAmountRange(rng, 1_000n, 100n)).toThrow(/max must be/);
  });

  it("throws when the range exceeds Number.MAX_SAFE_INTEGER", () => {
    const rng = createRng(42);
    expect(() => sampleAmountRange(rng, 0n, 2n ** 60n)).toThrow(/exceeds Number.MAX_SAFE_INTEGER/);
  });
});
