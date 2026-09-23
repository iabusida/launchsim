import type { Actor, ActorContext, Order, WalletView } from "../types.js";
import type { ScheduledActor } from "../engine/engine.js";
import type { Rng } from "../engine/rng.js";
import { monitoringSlots } from "./monitoring-slots.js";
import { sampleAmountRange } from "./sample-amount-range.js";

/**
 * `panicSeller` config: pre-existing holders who sell everything when
 * drawdown from the pool's running peak exceeds a threshold (docs/03).
 * Unlike the other actors, panicSellers start the scenario already
 * holding base -- they never buy.
 */
export interface PanicSellerConfig {
  readonly holdingsMin: bigint;
  readonly holdingsMax: bigint;
  readonly triggerDrawdownBps: bigint;
}

/** {@link createPanicSellerActors}'s output: the actors, and the wallets they start with. */
export interface PanicSellerActors {
  readonly scheduled: readonly ScheduledActor[];
  readonly initialWallets: ReadonlyMap<string, WalletView>;
}

function isPastDrawdownTrigger(
  quoteReserve: bigint,
  peakQuoteReserve: bigint,
  triggerDrawdownBps: bigint,
): boolean {
  return (peakQuoteReserve - quoteReserve) * 10_000n >= triggerDrawdownBps * peakQuoteReserve;
}

function createPanicSellerActor(id: string, config: PanicSellerConfig): Actor {
  return {
    id,
    group: "panicSeller",
    decide(ctx: ActorContext): readonly Order[] {
      if (ctx.wallet.baseBalance === 0n) {
        return [];
      }
      if (
        !isPastDrawdownTrigger(
          ctx.market.state.quoteReserve,
          ctx.market.peakQuoteReserve,
          config.triggerDrawdownBps,
        )
      ) {
        return [];
      }
      return [
        {
          actorId: id,
          group: "panicSeller",
          side: "sell",
          priorityFee: 0n,
          reason: "panic sell: drawdown trigger",
          sell: { baseIn: ctx.wallet.baseBalance, minQuoteOut: 0n },
        },
      ];
    },
  };
}

/**
 * Builds `count` panicSeller {@link ScheduledActor}s, each pre-funded with
 * holdings sampled from `[holdingsMin, holdingsMax]`, monitored every
 * `monitorStep` slots from 0 through `duration` for a drawdown trigger.
 *
 * @param config - Holdings range and the drawdown trigger, in basis points.
 * @param count - How many panicSeller instances to create.
 * @param duration - The scenario's total slots, monitored up to.
 * @param monitorStep - How often (in slots) to check the drawdown trigger.
 * @param rng - Forked once per instance (`rng.fork(id)`) to sample holdings (docs/03).
 */
export function createPanicSellerActors(
  config: PanicSellerConfig,
  count: number,
  duration: number,
  monitorStep: number,
  rng: Rng,
): PanicSellerActors {
  const scheduled: ScheduledActor[] = [];
  const initialWallets = new Map<string, WalletView>();
  for (let i = 0; i < count; i++) {
    const id = `panicSeller-${String(i)}`;
    const holdings = sampleAmountRange(rng.fork(id), config.holdingsMin, config.holdingsMax);
    scheduled.push({
      actor: createPanicSellerActor(id, config),
      slots: monitoringSlots(0, duration, monitorStep),
    });
    initialWallets.set(id, { quoteBalance: 0n, baseBalance: holdings, entryPrice: null });
  }
  return { scheduled, initialWallets };
}
