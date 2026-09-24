import { describe, it, expect } from "vitest";
import { createRng } from "./rng.js";

describe("createRng", () => {
  it("is deterministic: the same seed produces the same sequence", () => {
    const a = createRng(42);
    const b = createRng(42);
    const sequenceA = [a.next(), a.next(), a.next()];
    const sequenceB = [b.next(), b.next(), b.next()];
    expect(sequenceA).toEqual(sequenceB);
  });

  it("matches pinned values for seed 42 (docs/07: determinism is load-bearing)", () => {
    // Pinned so a change to the algorithm's constants is caught here first,
    // not as a silent shift in every scenario's results. Update deliberately.
    const rng = createRng(42);
    expect([rng.next(), rng.next(), rng.next()]).toEqual([
      0.6011037519201636, 0.44829055899754167, 0.8524657934904099,
    ]);
  });

  it("different seeds produce different sequences", () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it("next() returns a value in [0, 1)", () => {
    const rng = createRng(42);
    for (let i = 0; i < 100; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("accepts a seed of exactly 0", () => {
    expect(() => createRng(0)).not.toThrow();
  });

  it("throws when the seed is negative", () => {
    expect(() => createRng(-1)).toThrow(/uint32/);
  });

  it("throws when the seed is not a safe integer", () => {
    expect(() => createRng(1.5)).toThrow(/uint32/);
  });

  it("throws when the seed exceeds the uint32 range", () => {
    expect(() => createRng(2 ** 32)).toThrow(/uint32/);
  });
});

describe("Rng.nextInt", () => {
  it("returns an integer in [0, maxExclusive)", () => {
    const rng = createRng(42);
    for (let i = 0; i < 100; i++) {
      const value = rng.nextInt(10);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(10);
    }
  });

  it("always returns 0 when maxExclusive is 1", () => {
    const rng = createRng(42);
    expect(rng.nextInt(1)).toBe(0);
  });

  it("throws when maxExclusive is zero", () => {
    const rng = createRng(42);
    expect(() => rng.nextInt(0)).toThrow(/positive/);
  });

  it("throws when maxExclusive is negative", () => {
    const rng = createRng(42);
    expect(() => rng.nextInt(-1)).toThrow(/positive/);
  });

  it("throws when maxExclusive is not an integer", () => {
    const rng = createRng(42);
    expect(() => rng.nextInt(1.5)).toThrow(/integer/);
  });
});

describe("Rng.fork", () => {
  it("is deterministic: the same id produces the same child sequence", () => {
    const parentA = createRng(42);
    const parentB = createRng(42);
    const childA = parentA.fork("sniper-0");
    const childB = parentB.fork("sniper-0");
    expect([childA.next(), childA.next()]).toEqual([childB.next(), childB.next()]);
  });

  it("matches a pinned value for seed 42 forked as \"sniper-0\"", () => {
    // Pins both mulberry32's constants and fnv1a32's hash together.
    expect(createRng(42).fork("sniper-0").next()).toBe(0.09641121770255268);
  });

  it("different ids produce different child sequences", () => {
    const parent = createRng(42);
    const childA = parent.fork("sniper-0");
    const childB = parent.fork("sniper-1");
    expect(childA.next()).not.toBe(childB.next());
  });

  it("forking does not change the parent's subsequent draws", () => {
    const untouched = createRng(42);
    const parent = createRng(42);
    parent.fork("sniper-0"); // forking alone must not consume the parent's stream
    expect(parent.next()).toBe(untouched.next());
  });

  it("forking twice with the same id gives the same child stream both times", () => {
    const parent = createRng(42);
    const firstFork = parent.fork("sniper-0").next();
    const secondFork = parent.fork("sniper-0").next();
    expect(firstFork).toBe(secondFork);
  });
});
