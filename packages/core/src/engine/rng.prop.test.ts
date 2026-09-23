import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createRng } from "./rng.js";

const seedArb = fc.integer({ min: 0, max: 2 ** 32 - 1 });

describe("createRng (properties)", () => {
  it("next() always returns a value in [0, 1)", () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const value = createRng(seed).next();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }),
      { seed: 42, numRuns: 500 },
    );
  });

  it("the same seed always produces the same sequence", () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const a = createRng(seed);
        const b = createRng(seed);
        const sequenceA = Array.from({ length: 5 }, () => a.next());
        const sequenceB = Array.from({ length: 5 }, () => b.next());
        expect(sequenceA).toEqual(sequenceB);
      }),
      { seed: 42, numRuns: 500 },
    );
  });

  it("nextInt(max) always returns an integer in [0, max)", () => {
    fc.assert(
      fc.property(seedArb, fc.integer({ min: 1, max: 1_000_000 }), (seed, max) => {
        const value = createRng(seed).nextInt(max);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(max);
      }),
      { seed: 42, numRuns: 500 },
    );
  });

  it("forking with the same id is deterministic regardless of parent seed", () => {
    fc.assert(
      fc.property(seedArb, fc.string(), (seed, id) => {
        const parentA = createRng(seed);
        const parentB = createRng(seed);
        expect(parentA.fork(id).next()).toBe(parentB.fork(id).next());
      }),
      { seed: 42, numRuns: 500 },
    );
  });
});
