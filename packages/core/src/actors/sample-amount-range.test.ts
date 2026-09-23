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

  it("returns a value within a range far wider than Number.MAX_SAFE_INTEGER (18-decimal MON amounts)", () => {
    const rng = createRng(42);
    const min = 100_000_000_000_000_000n; // 0.1 MON
    const max = 1_000_000_000_000_000_000n; // 1 MON
    for (let i = 0; i < 50; i++) {
      const value = sampleAmountRange(rng, min, max);
      expect(value >= min && value <= max).toBe(true);
    }
  });

  it("is deterministic for a given seed on a range wider than Number.MAX_SAFE_INTEGER", () => {
    const min = 0n;
    const max = 2n ** 60n;
    const a = sampleAmountRange(createRng(42), min, max);
    const b = sampleAmountRange(createRng(42), min, max);
    expect(a).toBe(b);
    expect(a >= min && a <= max).toBe(true);
  });

  it("returns a value within a range spanning multiple 32-bit chunks but not a full chunk boundary", () => {
    const rng = createRng(7);
    const min = 0n;
    const max = (1n << 40n) + 12345n; // not a clean power-of-two boundary
    for (let i = 0; i < 20; i++) {
      const value = sampleAmountRange(rng, min, max);
      expect(value >= min && value <= max).toBe(true);
    }
  });

  // The following pin exact outputs of the deterministic bit-masking
  // algorithm (bitLength -> chunk count -> mask -> draw -> reject), rather
  // than only bounds-checking, so an off-by-one in any of those steps
  // (e.g. a wrong `+`/`-`, `<`/`<=`, or a dropped loop body) changes a
  // pinned value and fails loudly instead of surviving as a mutant.
  it("pins the exact value for a 1-bit range (width 1)", () => {
    expect(sampleAmountRange(createRng(42), 100n, 101n)).toBe(100n);
  });

  it("pins the exact value for a range exactly at a power-of-two boundary (width 3)", () => {
    expect(sampleAmountRange(createRng(42), 0n, 3n)).toBe(0n);
  });

  it("pins the exact value for a range just past a power-of-two boundary (width 4)", () => {
    expect(sampleAmountRange(createRng(42), 0n, 4n)).toBe(4n);
  });

  it("pins the exact value for a range needing exactly two 32-bit chunks", () => {
    expect(sampleAmountRange(createRng(42), 0n, 2n ** 40n)).toBe(827_510_206_637n);
  });

  it("pins the exact value for a two-chunk range on a different seed", () => {
    expect(sampleAmountRange(createRng(7), 0n, 2n ** 40n)).toBe(406_729_231_254n);
  });

  it("pins the exact value at the exact 32-bit chunk-count boundary (bits === 32)", () => {
    // Distinguishes a correct ceil-div chunk count from an off-by-one:
    // both round down to the same chunk count for any bit-width that
    // isn't an exact multiple of 32, only diverging exactly here.
    expect(sampleAmountRange(createRng(42), 0n, 2n ** 32n - 1n)).toBe(2_581_720_956n);
  });

  it("never accepts a masked draw that lands exactly on the exclusive upper bound", () => {
    // width 4 (maxExclusive 5) against a 3-bit mask (0-7): over enough
    // draws, the masked value 5 is certain to come up and must be
    // rejected and resampled, not accepted as `max + 1`.
    const rng = createRng(42);
    for (let i = 0; i < 1_000; i++) {
      const value = sampleAmountRange(rng, 0n, 4n);
      expect(value <= 4n).toBe(true);
    }
  });
});
