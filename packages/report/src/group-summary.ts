import type { ActorGroup, TradeRecord } from "@launchsim/core";

/** Per-group spend/receipts, for the report's "Who profited" table (docs/04). */
export interface GroupSummary {
  readonly group: ActorGroup;
  readonly spent: bigint;
  readonly received: bigint;
  readonly pnl: bigint;
}

/**
 * Aggregates the trade log into a {@link GroupSummary} per group: `spent`
 * is quote paid in successful buys, `received` is quote taken in
 * successful sells, `pnl` is `received - spent`. This is realized PnL
 * only -- it does not value any base still held (docs/09: out of MVP
 * scope). Sorted by group name for deterministic output.
 *
 * @param trades - The engine run's trade log.
 */
export function summarizeGroups(trades: readonly TradeRecord[]): GroupSummary[] {
  const byGroup = new Map<ActorGroup, { spent: bigint; received: bigint }>();
  for (const trade of trades) {
    if (!trade.ok) {
      continue;
    }
    const totals = byGroup.get(trade.group) ?? { spent: 0n, received: 0n };
    if (trade.side === "buy") {
      totals.spent += trade.quote;
    } else {
      totals.received += trade.quote;
    }
    byGroup.set(trade.group, totals);
  }
  return [...byGroup.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1)) // Map keys are unique, so a === b never happens here
    .map(([group, totals]) => ({
      group,
      spent: totals.spent,
      received: totals.received,
      pnl: totals.received - totals.spent,
    }));
}
