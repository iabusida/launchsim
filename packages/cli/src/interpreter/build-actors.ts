import {
  createPanicSellerActors,
  createRetailActors,
  createSniperActors,
  createWhaleActor,
  createWallet,
  parseAmount,
  parseAmountRange,
  parseBaseUnitsRange,
  parseDuration,
  parsePercent,
  parseSlotOrDuration,
  type Rng,
  type ScenarioConfig,
  type ScheduledActor,
  type WalletView,
} from "@launchsim/core";

const BPS_SCALE = 10_000n;

/** {@link buildActors}'s output: every scheduled actor plus its starting wallet. */
export interface BuiltActors {
  readonly scheduledActors: readonly ScheduledActor[];
  readonly initialWallets: ReadonlyMap<string, WalletView>;
}

/**
 * Builds every actor a scenario configures (docs/02, docs/03) into
 * {@link ScheduledActor}s the engine can run, plus a starting wallet for
 * each. Buy-side actors (retail, sniper, whale) are funded at their
 * configured spend's upper bound, generous enough that a sampled spend
 * never gets blocked by insufficient funds; panic sellers already hold
 * the launched token and are funded by `createPanicSellerActors` itself.
 *
 * @throws {RangeError} If a config entry's group isn't implemented yet
 *   (`bundler`, `flipper` -- schema-validated as M2 stretch actors, but no
 *   engine builder exists for them, see docs/09).
 */
export function buildActors(
  actors: ScenarioConfig["actors"],
  duration: number,
  sampleEvery: number,
  slotMs: number,
  rng: Rng,
): BuiltActors {
  const scheduledActors: ScheduledActor[] = [];
  const initialWallets = new Map<string, WalletView>();

  actors.forEach((actor, index) => {
    if (actor.group === "retail") {
      const spend = parseAmountRange(actor.spend);
      const stopLossBps = parsePercent(actor.stopLossPct);
      const built = createRetailActors(
        {
          spendMin: spend.min,
          spendMax: spend.max,
          overSlots: parseDuration(actor.over, slotMs),
          takeProfitX: actor.takeProfitX,
          stopLossMultiplier: 1 - Number(stopLossBps) / Number(BPS_SCALE),
          sellProbabilityBps: BigInt(actor.sellProbabilityBps),
        },
        actor.count,
        duration,
        sampleEvery,
        rng.fork(`retail-${String(index)}`),
      );
      for (const scheduled of built) {
        scheduledActors.push(scheduled);
        initialWallets.set(scheduled.actor.id, createWallet(spend.max));
      }
      return;
    }

    if (actor.group === "sniper") {
      const spend = parseAmountRange(actor.spend);
      const built = createSniperActors(
        {
          spendMin: spend.min,
          spendMax: spend.max,
          at: parseSlotOrDuration(actor.at, slotMs),
          priorityFee: actor.priorityFee ? parseAmount(actor.priorityFee) : 0n,
          holdSlots: actor.holdSlots,
          sellAtX: actor.sellAtX,
        },
        actor.count,
        duration,
        rng.fork(`sniper-${String(index)}`),
      );
      for (const scheduled of built) {
        scheduledActors.push(scheduled);
        initialWallets.set(scheduled.actor.id, createWallet(spend.max));
      }
      return;
    }

    if (actor.group === "whale") {
      const spend = parseAmount(actor.spend);
      const scheduled = createWhaleActor(
        `whale-${String(index)}`,
        { spend, at: parseDuration(actor.at, slotMs), sellAtX: actor.sellAtX },
        duration,
        sampleEvery,
      );
      scheduledActors.push(scheduled);
      initialWallets.set(scheduled.actor.id, createWallet(spend));
      return;
    }

    if (actor.group === "panicSeller") {
      const holdings = parseBaseUnitsRange(actor.holdings);
      const built = createPanicSellerActors(
        {
          holdingsMin: holdings.min,
          holdingsMax: holdings.max,
          triggerDrawdownBps: parsePercent(actor.triggerDrawdown),
        },
        actor.count,
        duration,
        sampleEvery,
        rng.fork(`panicSeller-${String(index)}`),
      );
      scheduledActors.push(...built.scheduled);
      for (const [id, wallet] of built.initialWallets) {
        initialWallets.set(id, wallet);
      }
      return;
    }

    throw new RangeError(
      `buildActors: actor group "${actor.group}" is not yet implemented (docs/09 M2 stretch)`,
    );
  });

  return { scheduledActors, initialWallets };
}
