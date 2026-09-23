/**
 * Formats basis points as a percentage string, e.g. `500n` -> `"5%"`,
 * `3_456n` -> `"34.56%"`. Trims trailing zero fractional digits rather
 * than always showing 2 decimal places.
 *
 * @throws {RangeError} If `bps` is negative.
 */
export function formatBps(bps: bigint): string {
  if (bps < 0n) {
    throw new RangeError("formatBps: bps must be non-negative");
  }
  const whole = bps / 100n;
  const fraction = bps % 100n;
  if (fraction === 0n) {
    return `${whole.toString()}%`;
  }
  const fractionStr = fraction.toString().padStart(2, "0").replace(/0$/, "");
  return `${whole.toString()}.${fractionStr}%`;
}
