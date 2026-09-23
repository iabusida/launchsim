import { bpsOf } from "../math/bps-of.js";
import type { Mechanic, MechanicContext, MechanicEvent } from "../types.js";

/**
 * `feeBuyback` config: spends `feeShareBps` of accrued fees buying base
 * every `intervalSlots`, then burns what was bought (docs/02). `minBuy`
 * skips dust-sized buys.
 */
export interface FeeBuybackMechanicConfig {
  readonly intervalSlots: number;
  readonly feeShareBps: bigint;
  readonly minBuy: bigint;
}

const NO_OP_RESULT = (slot: number, id: string): MechanicEvent => ({
  slot,
  mechanicId: id,
  baseBurned: 0n,
  quoteSpent: 0n,
});

/**
 * Builds the `feeBuyback` {@link Mechanic}: every `intervalSlots`,
 * withdraws accrued fees, buys base with `feeShareBps` of them, and burns
 * the purchased base -- the fee-funded fix (docs/02). The unused share of
 * withdrawn fees is not redeposited; modeling a protocol treasury is out
 * of scope for the MVP spike (docs/09).
 *
 * @param id - This mechanic's id.
 * @param config - The interval, fee share, and dust threshold.
 */
export function createFeeBuybackMechanic(id: string, config: FeeBuybackMechanicConfig): Mechanic {
  return {
    id,
    due(slot: number): boolean {
      return slot > 0 && slot % config.intervalSlots === 0;
    },
    apply(ctx: MechanicContext): MechanicEvent {
      const fees = ctx.market.withdrawFees();
      const buyAmount = bpsOf(fees, config.feeShareBps);
      if (buyAmount < config.minBuy || buyAmount === 0n) {
        return NO_OP_RESULT(ctx.slot, id);
      }
      const outcome = ctx.market.buy({ quoteIn: buyAmount, minBaseOut: 0n });
      if (!outcome.ok) {
        return NO_OP_RESULT(ctx.slot, id);
      }
      if (outcome.amountOut > 0n) {
        ctx.market.burnFromPool(outcome.amountOut);
      }
      return { slot: ctx.slot, mechanicId: id, baseBurned: outcome.amountOut, quoteSpent: buyAmount };
    },
  };
}
