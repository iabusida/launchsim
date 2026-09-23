import type { Actor, ActorContext, Order } from "../types.js";
import type { ScheduledActor } from "../engine/engine.js";
import type { Rng } from "../engine/rng.js";
import { hasReachedMultiple, hasDroppedToMultiple } from "./price-target.js";
import { monitoringSlots } from "./monitoring-slots.js";
import { sampleAmountRange } from "./sample-amount-range.js";

/**
 * `retail` config: arrives spread over a window, buys once, holds; some
 * sell on profit or loss (docs/03). Defaults per docs/03: 30% sell at 2x,
 * 20% sell at -50% -- modeled here as a single `sellProbabilityBps` roll
 * checked whenever either target is reached.
 */
export interface RetailConfig {
  readonly spendMin: bigint;
  readonly spendMax: bigint;
  readonly overSlots: number;
  readonly takeProfitX: number;
  readonly stopLossMultiplier: number;
  readonly sellProbabilityBps: bigint;
}

function createRetailActor(id: string, config: RetailConfig, spend: bigint, arrivalSlot: number): Actor {
  return {
    id,
    group: "retail",
    decide(ctx: ActorContext): readonly Order[] {
      if (ctx.slot === arrivalSlot && ctx.wallet.baseBalance === 0n) {
        return [
          {
            actorId: id,
            group: "retail",
            side: "buy",
            priorityFee: 0n,
            reason: "retail entry",
            buy: { quoteIn: spend, minBaseOut: 0n },
          },
        ];
      }
      if (ctx.wallet.baseBalance === 0n || !ctx.wallet.entryPrice) {
        return [];
      }
      const tookProfit = hasReachedMultiple(ctx.market.price, ctx.wallet.entryPrice, config.takeProfitX);
      const stoppedOut = hasDroppedToMultiple(
        ctx.market.price,
        ctx.wallet.entryPrice,
        config.stopLossMultiplier,
      );
      if (!tookProfit && !stoppedOut) {
        return [];
      }
      if (BigInt(Math.floor(ctx.rng.next() * 10_000)) >= config.sellProbabilityBps) {
        return [];
      }
      return [
        {
          actorId: id,
          group: "retail",
          side: "sell",
          priorityFee: 0n,
          reason: tookProfit ? "retail exit: take profit" : "retail exit: stop loss",
          sell: { baseIn: ctx.wallet.baseBalance, minQuoteOut: 0n },
        },
      ];
    },
  };
}

/**
 * Builds `count` retail {@link ScheduledActor}s, each arriving at a slot
 * sampled uniformly over `[0, overSlots]`, buying once, then monitored
 * every `monitorStep` slots for a probabilistic take-profit/stop-loss exit.
 *
 * @param config - Spend range, arrival window, and exit targets.
 * @param count - How many retail instances to create.
 * @param duration - The scenario's total slots, monitored up to.
 * @param monitorStep - How often (in slots) to check the sell condition after arrival.
 * @param rng - Forked once per instance (`rng.fork(id)`) to sample arrival and spend (docs/03).
 */
export function createRetailActors(
  config: RetailConfig,
  count: number,
  duration: number,
  monitorStep: number,
  rng: Rng,
): ScheduledActor[] {
  const scheduled: ScheduledActor[] = [];
  for (let i = 0; i < count; i++) {
    const id = `retail-${String(i)}`;
    const instanceRng = rng.fork(id);
    const spend = sampleAmountRange(instanceRng, config.spendMin, config.spendMax);
    const arrivalSlot = instanceRng.nextInt(config.overSlots + 1);
    scheduled.push({
      actor: createRetailActor(id, config, spend, arrivalSlot),
      slots: monitoringSlots(arrivalSlot, duration, monitorStep),
    });
  }
  return scheduled;
}
