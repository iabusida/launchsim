import {
  createFeeBuybackMechanic,
  createLpBurnMechanic,
  parseAmount,
  parseDuration,
  parsePercent,
  type Mechanic,
  type ScenarioConfig,
} from "@launchsim/core";

const ONE_HOUR = "1h";

/**
 * Builds every mechanic a scenario configures (docs/02) into
 * {@link Mechanic}s the engine can run. `lpBurn` always burns on a
 * 1-hour cadence -- its `perHour` field name is the schedule, not a
 * separately configurable interval.
 */
export function buildMechanics(mechanics: ScenarioConfig["mechanics"], slotMs: number): Mechanic[] {
  return mechanics.map((mechanic, index) => {
    if (mechanic.kind === "lpBurn") {
      return createLpBurnMechanic(`lpBurn-${String(index)}`, {
        perHourBps: mechanic.perHour.map((bps) => parsePercent(bps)),
        burnIntervalSlots: parseDuration(ONE_HOUR, slotMs),
        stepEverySlots: parseDuration(mechanic.stepEvery, slotMs),
      });
    }
    return createFeeBuybackMechanic(`feeBuyback-${String(index)}`, {
      intervalSlots: parseDuration(mechanic.interval, slotMs),
      feeShareBps: BigInt(mechanic.feeShareBps),
      minBuy: mechanic.minBuy ? parseAmount(mechanic.minBuy) : 0n,
    });
  });
}
