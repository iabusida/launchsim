import type { Check, CheckResult, Ledger } from "../types.js";

/**
 * `maxDrawdownBelow` (docs/04): passes when the largest peak-to-trough
 * price drop within any `window`-slot span is below `bps`. Price is
 * `quoteReserve / baseReserve` at each sample, compared exactly by
 * cross-multiplication (ADR 0003), never by dividing bigints.
 *
 * O(samples^2) worst case, bounded in practice by how many samples fall
 * within `window` of each other.
 *
 * @param bps - The drawdown threshold, in basis points.
 * @param window - The span, in slots, within which a drawdown is measured.
 */
export function createMaxDrawdownBelowCheck(bps: bigint, window: number): Check {
  return {
    id: "maxDrawdownBelow",
    evaluate(ledger: Ledger): CheckResult {
      const { samples } = ledger.timeline;
      let worstDropBps = 0n;
      let worstSlot: number | null = null;

      // Stryker disable next-line EqualityOperator: `i < length` vs `i <=
      // length` are equivalent here -- the one extra iteration reads
      // samples[length] (undefined), and the `!peak` guard below already
      // skips it with no observable difference (verified 2026-09-24).
      for (let i = 0; i < samples.length; i++) {
        const peak = samples[i];
        if (!peak || peak.quoteReserve <= 0n) {
          continue;
        }
        // Stryker disable next-line EqualityOperator: same reasoning as the
        // outer loop -- the extra iteration reads an undefined `trough`,
        // caught by the `!trough` guard below.
        for (let j = i + 1; j < samples.length; j++) {
          const trough = samples[j];
          if (!trough || trough.slot - peak.slot > window) {
            break;
          }
          const peakCross = trough.quoteReserve * peak.baseReserve;
          const troughCross = peak.quoteReserve * trough.baseReserve;
          if (peakCross >= troughCross) {
            continue; // not a drop: trough price is at or above peak price
          }
          // round: pool-favoring -- floors the surviving ratio, so it never
          // understates the drop.
          const ratioBps = (peakCross * 10_000n) / troughCross;
          const dropBps = 10_000n - ratioBps;
          if (dropBps > worstDropBps) {
            worstDropBps = dropBps;
            worstSlot = trough.slot;
          }
        }
      }

      const passed = worstDropBps < bps;
      return {
        id: "maxDrawdownBelow",
        kind: "maxDrawdownBelow",
        passed,
        summary: passed
          ? `max ${String(window)}-slot drawdown was ${String(worstDropBps / 100n)}%, below the ${String(bps / 100n)}% limit`
          : `max ${String(window)}-slot drawdown reached ${String(worstDropBps / 100n)}% at slot ${String(worstSlot)}`,
        observed: worstDropBps.toString(),
        threshold: bps.toString(),
        atSlot: passed ? null : worstSlot,
      };
    },
  };
}
