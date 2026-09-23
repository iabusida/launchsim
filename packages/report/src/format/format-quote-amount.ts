const LAMPORTS_PER_SOL = 1_000_000_000n;
const DISPLAY_DECIMALS = 2;
const CENTI_SOL_SCALE = LAMPORTS_PER_SOL / 100n;

/**
 * Formats lamports as a decimal SOL string, e.g. `"12.34 SOL"`. Rounds
 * down (floors) rather than rounding nearest, consistent with the
 * pool-favoring rounding used everywhere else (docs/08); exact bigint
 * arithmetic throughout, no float conversion.
 *
 * @throws {RangeError} If `lamports` is negative.
 */
export function formatLamports(lamports: bigint): string {
  if (lamports < 0n) {
    throw new RangeError("formatLamports: lamports must be non-negative");
  }
  const centiSol = lamports / CENTI_SOL_SCALE;
  const whole = centiSol / 100n;
  const fraction = centiSol % 100n;
  return `${whole.toString()}.${fraction.toString().padStart(DISPLAY_DECIMALS, "0")} SOL`;
}
