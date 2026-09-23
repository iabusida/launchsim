import type { Actor, ActorContext, Order } from "../types.js";
import type { ScheduledActor } from "../engine/engine.js";
import type { Rng } from "../engine/rng.js";
import { hasReachedMultiple } from "./price-target.js";
import { monitoringSlots } from "./monitoring-slots.js";
import { sampleAmountRange } from "./sample-amount-range.js";

/** `sniper` config: buys early with a high priority fee, exits quickly (docs/03). */
export interface SniperConfig {
  readonly spendMin: bigint;
  readonly spendMax: bigint;
  readonly at: number;
  readonly priorityFee: bigint;
  readonly holdSlots: number;
  readonly sellAtX: number;
}

function createSniperActor(id: string, config: SniperConfig, spend: bigint): Actor {
  const exitSlot = config.at + config.holdSlots;
  return {
    id,
    group: "sniper",
    decide(ctx: ActorContext): readonly Order[] {
      if (ctx.slot === config.at && ctx.wallet.baseBalance === 0n) {
        return [
          {
            actorId: id,
            group: "sniper",
            side: "buy",
            priorityFee: config.priorityFee,
            reason: "sniper entry",
            buy: { quoteIn: spend, minBaseOut: 0n },
          },
        ];
      }
      if (ctx.wallet.baseBalance === 0n || !ctx.wallet.entryPrice) {
        return [];
      }
      if (hasReachedMultiple(ctx.market.price, ctx.wallet.entryPrice, config.sellAtX)) {
        return [
          {
            actorId: id,
            group: "sniper",
            side: "sell",
            priorityFee: config.priorityFee,
            reason: `sniper exit: ${String(config.sellAtX)}x target`,
            sell: { baseIn: ctx.wallet.baseBalance, minQuoteOut: 0n },
          },
        ];
      }
      if (ctx.slot >= exitSlot) {
        return [
          {
            actorId: id,
            group: "sniper",
            side: "sell",
            priorityFee: config.priorityFee,
            reason: "sniper exit: holdSlots elapsed",
            sell: { baseIn: ctx.wallet.baseBalance, minQuoteOut: 0n },
          },
        ];
      }
      return [];
    },
  };
}

/**
 * Builds `count` sniper {@link ScheduledActor}s, each entering at `config.at`
 * with a high priority fee and exiting after `holdSlots` or at `sellAtX`,
 * whichever comes first -- monitored every slot in that (short) window.
 *
 * @param config - Spend range, entry slot, priority fee, hold window, and sell target.
 * @param count - How many sniper instances to create.
 * @param duration - The scenario's total slots (snipers are never scheduled beyond it).
 * @param rng - Forked once per instance (`rng.fork(id)`) to sample its spend (docs/03).
 */
export function createSniperActors(
  config: SniperConfig,
  count: number,
  duration: number,
  rng: Rng,
): ScheduledActor[] {
  const scheduled: ScheduledActor[] = [];
  for (let i = 0; i < count; i++) {
    const id = `sniper-${String(i)}`;
    const spend = sampleAmountRange(rng.fork(id), config.spendMin, config.spendMax);
    const exitSlot = Math.min(config.at + config.holdSlots, duration);
    scheduled.push({
      actor: createSniperActor(id, config, spend),
      slots: monitoringSlots(config.at, exitSlot, 1),
    });
  }
  return scheduled;
}
