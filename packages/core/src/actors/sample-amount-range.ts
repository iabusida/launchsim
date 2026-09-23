import type { Rng } from "../engine/rng.js";

/**
 * Samples a uniform bigint in `[min, max]` using `rng`. The range width
 * must fit in `Number.MAX_SAFE_INTEGER`, asserted before any conversion
 * (docs/08: `number` is allowed for config-scale values, but must be a
 * checked safe integer) -- realistic lamport/token amount ranges are far
 * below this limit.
 *
 * @throws {RangeError} If `max < min`, or `max - min` exceeds `Number.MAX_SAFE_INTEGER`.
 */
export function sampleAmountRange(rng: Rng, min: bigint, max: bigint): bigint {
  if (max < min) {
    throw new RangeError("sampleAmountRange: max must be at or above min");
  }
  const width = max - min;
  if (width === 0n) {
    return min;
  }
  if (width > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("sampleAmountRange: range exceeds Number.MAX_SAFE_INTEGER");
  }
  return min + BigInt(rng.nextInt(Number(width) + 1));
}
