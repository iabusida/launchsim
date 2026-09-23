import type { Price } from "../math/price.js";

/** Fixed precision for converting a config-time `number` multiplier to an exact bigint ratio. */
const MULTIPLIER_SCALE = 1_000n;

/**
 * Whether `current` has reached (or exceeded) `multiplier` times `entry`,
 * compared exactly by cross-multiplication -- never by dividing bigints or
 * mixing them with floats (ADR 0003). `multiplier` is a config-time
 * `number` (docs/08 allows `number` for config values); it is converted to
 * an exact bigint ratio once, not on every comparison.
 *
 * @throws {RangeError} If `multiplier` is not positive.
 */
export function hasReachedMultiple(current: Price, entry: Price, multiplier: number): boolean {
  if (!(multiplier > 0)) {
    throw new RangeError("hasReachedMultiple: multiplier must be positive");
  }
  const multiplierNum = BigInt(Math.round(multiplier * Number(MULTIPLIER_SCALE)));
  // current >= entry * multiplier
  // current.num/current.den >= (entry.num * multiplierNum) / (entry.den * MULTIPLIER_SCALE)
  const left = current.num * entry.den * MULTIPLIER_SCALE;
  const right = entry.num * multiplierNum * current.den;
  return left >= right;
}

/**
 * Whether `current` has dropped to (or below) `multiplier` times `entry`
 * -- the stop-loss mirror of {@link hasReachedMultiple}. Same exact
 * cross-multiplication, comparison flipped.
 *
 * @throws {RangeError} If `multiplier` is not positive.
 */
export function hasDroppedToMultiple(current: Price, entry: Price, multiplier: number): boolean {
  if (!(multiplier > 0)) {
    throw new RangeError("hasDroppedToMultiple: multiplier must be positive");
  }
  const multiplierNum = BigInt(Math.round(multiplier * Number(MULTIPLIER_SCALE)));
  const left = current.num * entry.den * MULTIPLIER_SCALE;
  const right = entry.num * multiplierNum * current.den;
  return left <= right;
}
