/**
 * A price expressed as a ratio of quote to base, both in base units
 * (ADR 0003). Never divide `num` by `den` to compare or combine prices —
 * use {@link comparePrice}, which cross-multiplies instead.
 */
export interface Price {
  readonly num: bigint;
  readonly den: bigint;
}

/**
 * Builds a {@link Price} from a numerator and denominator (quote per base).
 *
 * @param num - Quote units. Must be non-negative.
 * @param den - Base units. Must be positive (a price has no meaning per zero base).
 * @example
 * ```ts
 * price(3n, 2n); // { num: 3n, den: 2n } -- 1.5 quote per base
 * ```
 */
export function price(num: bigint, den: bigint): Price {
  if (num < 0n) {
    throw new RangeError("price: num must be non-negative");
  }
  if (den <= 0n) {
    throw new RangeError("price: den must be positive");
  }
  return { num, den };
}

/**
 * Compares two prices by cross-multiplication, never by dividing (ADR 0003).
 *
 * @returns `-1` if `a` is lower than `b`, `1` if `a` is higher, `0` if equal.
 * @example
 * ```ts
 * comparePrice(price(1n, 2n), price(2n, 4n)); // 0 -- both are 0.5
 * ```
 */
export function comparePrice(a: Price, b: Price): -1 | 0 | 1 {
  const left = a.num * b.den;
  const right = b.num * a.den;
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}
