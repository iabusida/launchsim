import { describe, it, expect } from "vitest";
import { downsample } from "./downsample.js";

function series(n: number): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => ({ x: i, y: Math.sin(i) }));
}

describe("downsample", () => {
  it("returns the series unchanged when it already fits within maxPoints", () => {
    const input = series(10);
    expect(downsample(input, 600)).toEqual(input);
  });

  it("returns an empty array for an empty series", () => {
    expect(downsample([], 600)).toEqual([]);
  });

  it("returns a single point unchanged", () => {
    const input = [{ x: 0, y: 5 }];
    expect(downsample(input, 600)).toEqual(input);
  });

  it("reduces a large series to at most maxPoints", () => {
    const result = downsample(series(10_000), 600);
    expect(result.length).toBeLessThanOrEqual(600);
    expect(result.length).toBeGreaterThan(0);
  });

  it("preserves the first and last points", () => {
    const input = series(10_000);
    const result = downsample(input, 600);
    expect(result[0]).toEqual(input[0]);
    expect(result.at(-1)).toEqual(input.at(-1));
  });

  it("preserves x-ordering in the output", () => {
    const result = downsample(series(10_000), 600);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]?.x).toBeGreaterThanOrEqual(result[i - 1]?.x ?? 0);
    }
  });

  it("keeps a flat series (constant y) as a small output, not maxPoints", () => {
    const flat = Array.from({ length: 10_000 }, (_, i) => ({ x: i, y: 1 }));
    const result = downsample(flat, 600);
    expect(result.length).toBeLessThanOrEqual(600);
  });

  it("preserves a sharp spike within a bucket (min/max, not just an average)", () => {
    const input = Array.from({ length: 1_000 }, (_, i) => ({ x: i, y: i === 500 ? 1_000 : 0 }));
    const result = downsample(input, 100);
    expect(result.some((p) => p.y === 1_000)).toBe(true);
  });

  it("throws when maxPoints is less than 2", () => {
    expect(() => downsample(series(10), 1)).toThrow(/at least 2/);
  });
});
