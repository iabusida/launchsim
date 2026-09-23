/**
 * Returns the smaller of two bigints.
 *
 * @example
 * ```ts
 * minBig(3n, 7n); // 3n
 * ```
 */
export function minBig(a: bigint, b: bigint): bigint {
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
  return a > b ? a : b;
}
