import { describe, it, expect } from "vitest";
import { minBig, maxBig } from "./min-max-big.js";

describe("minBig", () => {
  it("returns the smaller of two bigints when the smaller is first", () => {
    expect(minBig(3n, 7n)).toBe(3n);
  });

  it("returns the smaller of two bigints when the smaller is second", () => {
    expect(minBig(7n, 3n)).toBe(3n);
  });

  it("returns either value when they are equal", () => {
    expect(minBig(5n, 5n)).toBe(5n);
  });

  it("works with negative values", () => {
    expect(minBig(-3n, 7n)).toBe(-3n);
  });
});

describe("maxBig", () => {
  it("returns the larger of two bigints when the larger is first", () => {
    expect(maxBig(7n, 3n)).toBe(7n);
  });

  it("returns the larger of two bigints when the larger is second", () => {
    expect(maxBig(3n, 7n)).toBe(7n);
  });

  it("returns either value when they are equal", () => {
    expect(maxBig(5n, 5n)).toBe(5n);
  });

  it("works with negative values", () => {
    expect(maxBig(-3n, -7n)).toBe(-3n);
  });
});
