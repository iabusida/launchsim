import { maxBig } from "../math/min-max-big.js";
import { price } from "../math/price.js";
import type {
  Actor,
  Market,
  Mechanic,
  MechanicEvent,
  Order,
  Timeline,
  TimelineSample,
  TradeRecord,
  WalletView,
} from "../types.js";
import { comparePriorityFeeDescending } from "./compare-priority-fee.js";
import type { Clock } from "./clock.js";
import { createEventQueue } from "./event-queue.js";
import type { Rng } from "./rng.js";
import { applyFill, createWallet } from "./wallet.js";

/** An actor plus the slots at which the engine should ask it to `decide`. */
export interface ScheduledActor {
  readonly actor: Actor;
  readonly slots: readonly number[];
}

/** A completed engine run's full output. */
export interface EngineResult {
  readonly durationSlots: number;
  readonly timeline: Timeline;
  readonly trades: readonly TradeRecord[];
  readonly mechanicEvents: readonly MechanicEvent[];
  readonly wallets: ReadonlyMap<string, WalletView>;
}

/** The engine's inputs for one run. */
export interface EngineConfig {
  readonly market: Market;
  readonly mechanics: readonly Mechanic[];
  readonly scheduledActors: readonly ScheduledActor[];
  readonly initialWallets: ReadonlyMap<string, WalletView>;
  readonly duration: number;
  readonly sampleEvery: number;
  readonly clock: Clock;
  readonly rng: Rng;
}

/**
 * A payload id no real actor can have (actor ids are caller-supplied
 * strings; this is reserved). Ticks make the engine visit every slot --
 * including ones with no actor activity -- so mechanics and periodic
 * sampling never silently skip a quiet slot (docs/01: "per slot").
 */
// Stryker disable next-line StringLiteral: the literal text is arbitrary --
// TICK's only requirement is being a string no real actor id equals, so
// `actorEntries.get(TICK)` misses and the event is skipped either way.
// Verified 2026-09-24: an equivalent mutant, not a test gap.
const TICK = "__tick__";

/**
 * Runs the discrete-event simulation loop (docs/01): pop due events, ask
 * scheduled actors to decide, order their orders by priority fee, execute
 * them against `market`, run due mechanics, then sample the timeline.
 *
 * Deterministic given the same config and `rng` seed (docs/08 golden rule 5).
 */
export function runEngine(config: EngineConfig): EngineResult {
  if (!Number.isSafeInteger(config.duration) || config.duration < 0) {
    throw new RangeError("runEngine: duration must be a non-negative safe integer");
  }
  const queue = createEventQueue<string>();
  // actor and its forked Rng are always registered together, so one map
  // (rather than two kept in sync) makes that invariant structural.
  const actorEntries = new Map<string, { actor: Actor; rng: Rng }>();
  for (const { actor, slots } of config.scheduledActors) {
    actorEntries.set(actor.id, { actor, rng: config.rng.fork(actor.id) });
    for (const slot of slots) {
      queue.schedule(slot, actor.id);
    }
  }

  const wallets = new Map(config.initialWallets);
  const trades: TradeRecord[] = [];
  const mechanicEvents: MechanicEvent[] = [];
  const samples: TimelineSample[] = [];
  let peakQuoteReserve = config.market.state().quoteReserve;
  let nextSampleSlot = 0;

  function sample(slot: number): void {
    const state = config.market.state();
    peakQuoteReserve = maxBig(peakQuoteReserve, state.quoteReserve);
    samples.push({ slot, quoteReserve: state.quoteReserve, baseReserve: state.baseReserve });
  }

  queue.schedule(0, TICK);

  while (!queue.isEmpty()) {
    const nextSlot = queue.peekSlot();
    // Stryker disable next-line ConditionalExpression,BlockStatement: same
    // unreachability as the v8-ignore note below.
    /* v8 ignore next 3 -- coverage-ignore: unreachable, the while-guard already proved !queue.isEmpty(); TS narrowing only */
    if (nextSlot === null) {
      break;
    }
    if (nextSlot > config.duration) {
      break;
    }
    config.clock.advanceTo(nextSlot);
    const due = queue.popAllAtNextSlot();
    // Stryker disable next-line ConditionalExpression,EqualityOperator: an
    // extra tick queued at exactly `duration + 1` (from `<` becoming `<=`,
    // or the guard becoming unconditional) is never observable -- the loop
    // breaks as soon as it sees any slot > duration, before that tick is
    // ever popped. Verified 2026-09-24: an equivalent mutant.
    if (nextSlot < config.duration) {
      // Schedule the next tick lazily (one at a time), not the whole
      // duration upfront -- keeps the queue small across a long run.
      queue.schedule(nextSlot + 1, TICK);
    }

    const orders: Order[] = [];
    for (const event of due) {
      const actorId = event.payload;
      const entry = actorEntries.get(actorId);
      if (!entry) {
        continue;
      }
      const { actor, rng } = entry;
      const wallet = wallets.get(actorId) ?? createWallet(0n);
      const state = config.market.state();
      orders.push(
        ...actor.decide({
          slot: nextSlot,
          market: { state, price: price(state.quoteReserve, state.baseReserve), peakQuoteReserve },
          wallet,
          rng,
        }),
      );
    }

    orders.sort(comparePriorityFeeDescending);

    for (const order of orders) {
      const wallet = wallets.get(order.actorId) ?? createWallet(0n);
      let quoteAmount = 0n;
      let baseAmount = 0n;
      let ok = false;
      let reason: string | null = null;

      if (order.side === "buy" && order.buy) {
        if (order.buy.quoteIn > wallet.quoteBalance) {
          reason = "insufficient balance";
        } else {
          const outcome = config.market.buy(order.buy);
          ok = outcome.ok;
          if (outcome.ok) {
            quoteAmount = order.buy.quoteIn;
            baseAmount = outcome.amountOut;
          } else {
            reason = outcome.reason;
          }
        }
      } else if (order.side === "sell" && order.sell) {
        if (order.sell.baseIn > wallet.baseBalance) {
          reason = "insufficient balance";
        } else {
          const outcome = config.market.sell(order.sell);
          ok = outcome.ok;
          if (outcome.ok) {
            quoteAmount = outcome.amountOut;
            baseAmount = order.sell.baseIn;
          } else {
            reason = outcome.reason;
          }
        }
      } else {
        reason = "malformed order";
      }

      // Stryker disable next-line ConditionalExpression: `quoteAmount`/
      // `baseAmount` are only ever assigned inside an `outcome.ok` branch
      // above, so whenever `ok` is false they're still their initial 0n --
      // applying a (0n, 0n) fill unconditionally is a no-op on the wallet
      // (verified: applyFill leaves balances and entryPrice unchanged for
      // a zero-amount fill either side). Equivalent mutant, 2026-09-24.
      if (ok) {
        wallets.set(
          order.actorId,
          applyFill(wallet, { side: order.side, quoteAmount, baseAmount }),
        );
      }
      trades.push({
        slot: nextSlot,
        actorId: order.actorId,
        group: order.group,
        side: order.side,
        quote: quoteAmount,
        base: baseAmount,
        ok,
        reason,
      });
    }

    for (const mechanic of config.mechanics) {
      if (mechanic.due(nextSlot)) {
        mechanicEvents.push(mechanic.apply({ slot: nextSlot, market: config.market }));
      }
    }

    if (nextSlot >= nextSampleSlot) {
      sample(nextSlot);
      nextSampleSlot = nextSlot + config.sampleEvery;
    }
  }

  return {
    durationSlots: config.duration,
    timeline: { samples, peakQuoteReserve },
    trades,
    mechanicEvents,
    wallets,
  };
}
