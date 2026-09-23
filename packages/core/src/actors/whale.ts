import type { Actor, ActorContext, Order } from "../types.js";
import type { ScheduledActor } from "../engine/engine.js";
import { hasReachedMultiple } from "./price-target.js";
import { monitoringSlots } from "./monitoring-slots.js";

/** `whale` config: one large buy at a set time, sells at a multiple (docs/03). */
export interface WhaleConfig {
  readonly spend: bigint;
  readonly at: number;
  readonly sellAtX: number;
}

/**
 * Builds a `whale` {@link ScheduledActor}: buys `spend` at slot `at`, then
 * sells everything once the price reaches `sellAtX` times its entry price.
 *
 * @param id - This actor's id.
 * @param config - Spend, entry slot, and sell target.
 * @param duration - The scenario's total slots, monitored up to.
 * @param monitorStep - How often (in slots) to check the sell condition after entry.
 */
export function createWhaleActor(
  id: string,
  config: WhaleConfig,
  duration: number,
  monitorStep: number,
): ScheduledActor {
  const actor: Actor = {
    id,
    group: "whale",
    decide(ctx: ActorContext): readonly Order[] {
      if (ctx.slot === config.at && ctx.wallet.baseBalance === 0n) {
        return [
          {
            actorId: id,
            group: "whale",
            side: "buy",
            priorityFee: 0n,
            reason: "whale entry",
            buy: { quoteIn: config.spend, minBaseOut: 0n },
          },
        ];
      }
      if (
        ctx.wallet.baseBalance > 0n &&
        ctx.wallet.entryPrice &&
        hasReachedMultiple(ctx.market.price, ctx.wallet.entryPrice, config.sellAtX)
      ) {
        return [
          {
            actorId: id,
            group: "whale",
            side: "sell",
            priorityFee: 0n,
            reason: `whale exit: ${String(config.sellAtX)}x target`,
            sell: { baseIn: ctx.wallet.baseBalance, minQuoteOut: 0n },
          },
        ];
      }
      return [];
    },
  };
  return { actor, slots: monitoringSlots(config.at, duration, monitorStep) };
}
