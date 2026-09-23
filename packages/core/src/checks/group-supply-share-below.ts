import type { ActorGroup, Check, CheckResult, Ledger } from "../types.js";

/**
 * `groupSupplyShareBelow` (docs/04): passes when the supply held by
 * `group` at slot `at` is below `bps` of circulating supply. Both are
 * derived from the trade log (buys minus sells, up to and including
 * `at`), since the ledger only keeps final wallet balances, not a
 * per-slot snapshot.
 *
 * @param group - The actor group to check.
 * @param at - The slot to evaluate the share at.
 * @param bps - The threshold, in basis points.
 */
export function createGroupSupplyShareBelowCheck(group: ActorGroup, at: number, bps: bigint): Check {
  return {
    id: "groupSupplyShareBelow",
    evaluate(ledger: Ledger): CheckResult {
      let groupBase = 0n;
      let totalBase = 0n;
      for (const trade of ledger.trades) {
        if (!trade.ok || trade.slot > at) {
          continue;
        }
        const delta = trade.side === "buy" ? trade.base : -trade.base;
        totalBase += delta;
        if (trade.group === group) {
          groupBase += delta;
        }
      }
      const passed = totalBase <= 0n || groupBase * 10_000n < bps * totalBase;
      const observedBps = totalBase <= 0n ? 0n : (groupBase * 10_000n) / totalBase;
      return {
        id: "groupSupplyShareBelow",
        kind: "groupSupplyShareBelow",
        passed,
        summary: passed
          ? `${group} held ${String(observedBps / 100n)}% of supply at slot ${String(at)}, below the ${String(bps / 100n)}% limit`
          : `${group} held ${String(observedBps / 100n)}% of supply at slot ${String(at)}, at or above the ${String(bps / 100n)}% limit`,
        observed: observedBps.toString(),
        threshold: bps.toString(),
        atSlot: passed ? null : at,
      };
    },
  };
}
