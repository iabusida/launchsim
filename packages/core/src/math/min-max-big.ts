/**
 * Returns the smaller of two bigints.
 *
 * @example
 * ```ts
 * minBig(3n, 7n); // 3n
 * ```
 */
export function minBig(a: bigint, b: bigint): bigint {
  // Stryker disable next-line EqualityOperator: `a < b` vs `a <= b` only
  // differ when a === b, where both branches return the same value (a and
  // b are equal bigint primitives, indistinguishable by any caller) --
  // an equivalent mutant, not a test gap (verified 2026-09-24).
  return a < b ? a : b;
}

/**
 * Returns the larger of two bigints.
 *
 * @example
 * ```ts
 * maxBig(3n, 7n); // 7n
 * ```
 */
export function maxBig(a: bigint, b: bigint): bigint {
  // Stryker disable next-line EqualityOperator: same reasoning as minBig
  // above -- equivalent mutant when a === b.
  return a > b ? a : b;
}
