import { maxBig } from "../math/min-max-big.js";
import type { Check, CheckResult, Ledger } from "../types.js";

/**
 * `quoteNeverBelowPctOfPeak` (docs/04): passes when the pool's quote
 * reserve never drops below `bps` of its *running* peak (the peak seen so
 * far at each point, not the eventual final peak).
 *
 * @param bps - The minimum share of the running peak, in basis points.
 */
export function createQuoteNeverBelowPctOfPeakCheck(bps: bigint): Check {
  return {
    id: "quoteNeverBelowPctOfPeak",
    evaluate(ledger: Ledger): CheckResult {
      let runningPeak = 0n;
      for (const sample of ledger.timeline.samples) {
        runningPeak = maxBig(runningPeak, sample.quoteReserve);
        if (runningPeak > 0n && sample.quoteReserve * 10_000n < bps * runningPeak) {
          const observedBps = (sample.quoteReserve * 10_000n) / runningPeak;
          return {
            id: "quoteNeverBelowPctOfPeak",
            kind: "quoteNeverBelowPctOfPeak",
            passed: false,
            summary: `pool quote fell to ${String(observedBps / 100n)}% of peak at slot ${String(sample.slot)}`,
            observed: observedBps.toString(),
            threshold: bps.toString(),
            atSlot: sample.slot,
          };
        }
      }
      return {
        id: "quoteNeverBelowPctOfPeak",
        kind: "quoteNeverBelowPctOfPeak",
        passed: true,
        summary: `pool quote never fell below ${String(bps / 100n)}% of its running peak`,
        observed: bps.toString(),
        threshold: bps.toString(),
        atSlot: null,
      };
    },
  };
}
