import { bpsOf } from "../math/bps-of.js";
import { minBig } from "../math/min-max-big.js";
import type { Mechanic, MechanicContext, MechanicEvent } from "../types.js";

/**
 * `lpBurn` config: a stepped schedule of hourly (or whatever
 * `burnIntervalSlots` is) base-reserve burns, stepping to the next rate
 * every `stepEverySlots` (docs/02: `perHour: ["5%","4%","3%","1%"],
 * stepEvery: "24h"`).
 */
export interface LpBurnMechanicConfig {
  readonly perHourBps: readonly bigint[];
  readonly burnIntervalSlots: number;
  readonly stepEverySlots: number;
}

/**
 * Builds the `lpBurn` {@link Mechanic}: every `burnIntervalSlots`, burns
 * the current step's rate from the pool's base reserve, quote untouched --
 * the draining mechanic (docs/02).
 *
 * @param id - This mechanic's id.
 * @param config - The burn schedule.
 */
export function createLpBurnMechanic(id: string, config: LpBurnMechanicConfig): Mechanic {
  return {
    id,
    due(slot: number): boolean {
      return slot > 0 && slot % config.burnIntervalSlots === 0;
    },
    apply(ctx: MechanicContext): MechanicEvent {
      const step = minBig(
        BigInt(Math.floor(ctx.slot / config.stepEverySlots)),
        BigInt(config.perHourBps.length - 1),
      );
      /* v8 ignore next -- coverage-ignore: unreachable, `step` is always clamped to a valid index of perHourBps by minBig above; the fallback exists only for TS's noUncheckedIndexedAccess. */
      const rateBps = config.perHourBps[Number(step)] ?? 0n;
      const baseReserve = ctx.market.state().baseReserve;
      const burnAmount = bpsOf(baseReserve, rateBps);
      if (burnAmount > 0n) {
        ctx.market.burnFromPool(burnAmount);
      }
      return { slot: ctx.slot, mechanicId: id, baseBurned: burnAmount, quoteSpent: 0n };
    },
  };
}
