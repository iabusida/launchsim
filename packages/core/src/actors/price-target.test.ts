import { describe, it, expect } from "vitest";
import { price } from "../math/price.js";
import { hasReachedMultiple, hasDroppedToMultiple } from "./price-target.js";

describe("hasReachedMultiple", () => {
  it("returns true when the current price has reached the target multiple", () => {
    const entry = price(1n, 1n); // 1 quote per base
    const current = price(2n, 1n); // 2 quote per base
    expect(hasReachedMultiple(current, entry, 2)).toBe(true);
  });

  it("returns true when the current price has exceeded the target multiple", () => {
    const entry = price(1n, 1n);
    const current = price(3n, 1n);
    expect(hasReachedMultiple(current, entry, 2)).toBe(true);
  });

  it("returns false when the current price is below the target multiple", () => {
    const entry = price(1n, 1n);
    const current = price(3n, 2n); // 1.5x
    expect(hasReachedMultiple(current, entry, 2)).toBe(false);
  });

  it("handles a fractional multiplier exactly", () => {
    const entry = price(2n, 1n); // 2
    const current = price(3n, 1n); // 3 = 1.5x of 2
    expect(hasReachedMultiple(current, entry, 1.5)).toBe(true);
    expect(hasReachedMultiple(price(29n, 10n), entry, 1.5)).toBe(false); // 2.9 < 3
  });

  it("throws when multiplier is not positive", () => {
    expect(() => hasReachedMultiple(price(1n, 1n), price(1n, 1n), 0)).toThrow(/positive/);
  });
});

describe("hasDroppedToMultiple", () => {
  it("returns true when the current price has dropped to the target multiple", () => {
    const entry = price(2n, 1n); // 2
    const current = price(1n, 1n); // 1 = 0.5x of 2
    expect(hasDroppedToMultiple(current, entry, 0.5)).toBe(true);
  });

  it("returns true when the current price has dropped below the target multiple", () => {
    const entry = price(2n, 1n);
    const current = price(1n, 2n); // 0.5, below 0.5x of 2 (=1)
    expect(hasDroppedToMultiple(current, entry, 0.5)).toBe(true);
  });

  it("returns false when the current price is still above the target multiple", () => {
    const entry = price(2n, 1n);
    const current = price(3n, 2n); // 1.5, above 0.5x of 2 (=1)
    expect(hasDroppedToMultiple(current, entry, 0.5)).toBe(false);
  });

  it("throws when multiplier is not positive", () => {
    expect(() => hasDroppedToMultiple(price(1n, 1n), price(1n, 1n), 0)).toThrow(/positive/);
  });
});
