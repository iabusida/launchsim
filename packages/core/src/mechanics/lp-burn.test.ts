import { describe, it, expect } from "vitest";
import { createLpBurnMechanic } from "./lp-burn.js";
import type { Market, MechanicContext } from "../types.js";

function fakeMarket(baseReserve: bigint): { market: Market; burns: bigint[] } {
  const burns: bigint[] = [];
  const market: Market = {
    kind: "math/cpmm",
    state: () => ({ quoteReserve: 1_000_000n, baseReserve, quoteFeesCollected: 0n }),
    quoteBuy: () => ({ amountOut: 0n, feeAmount: 0n }),
    quoteSell: () => ({ amountOut: 0n, feeAmount: 0n }),
    buy: () => ({ ok: false, reason: "n/a" }),
    sell: () => ({ ok: false, reason: "n/a" }),
    burnFromPool: (baseAmount) => {
      burns.push(baseAmount);
    },
    withdrawFees: () => 0n,
  };
  return { market, burns };
}

function ctx(slot: number, market: Market): MechanicContext {
  return { slot, market };
}

describe("createLpBurnMechanic", () => {
  it("is due every burnIntervalSlots, starting after slot 0", () => {
    const mechanic = createLpBurnMechanic("lpBurn", {
      perHourBps: [500n],
      burnIntervalSlots: 100,
      stepEverySlots: 1_000,
    });
    expect(mechanic.due(0)).toBe(false);
    expect(mechanic.due(50)).toBe(false);
    expect(mechanic.due(100)).toBe(true);
    expect(mechanic.due(200)).toBe(true);
  });

  it("burns the first step's rate from the base reserve, quote untouched", () => {
    const mechanic = createLpBurnMechanic("lpBurn", {
      perHourBps: [500n, 400n], // 5%, then 4%
      burnIntervalSlots: 100,
      stepEverySlots: 1_000,
    });
    const { market, burns } = fakeMarket(1_000_000n);
    const event = mechanic.apply(ctx(100, market));
    expect(burns).toEqual([50_000n]); // 5% of 1,000,000
    expect(event).toEqual({ slot: 100, mechanicId: "lpBurn", baseBurned: 50_000n, quoteSpent: 0n });
  });

  it("steps to the next rate once stepEverySlots has elapsed", () => {
    const mechanic = createLpBurnMechanic("lpBurn", {
      perHourBps: [500n, 100n], // 5%, then 1%
      burnIntervalSlots: 100,
      stepEverySlots: 1_000,
    });
    const { market, burns } = fakeMarket(1_000_000n);
    mechanic.apply(ctx(1_000, market)); // second step: 1%
    expect(burns).toEqual([10_000n]);
  });

  it("stays on the last rate once past the end of the schedule", () => {
    const mechanic = createLpBurnMechanic("lpBurn", {
      perHourBps: [500n, 100n],
      burnIntervalSlots: 100,
      stepEverySlots: 1_000,
    });
    const { market, burns } = fakeMarket(1_000_000n);
    mechanic.apply(ctx(50_000, market)); // far past the schedule -> stays at 1%
    expect(burns).toEqual([10_000n]);
  });

  it("skips burning (no-op event) when the computed amount rounds to zero", () => {
    const mechanic = createLpBurnMechanic("lpBurn", {
      perHourBps: [1n], // 0.01%
      burnIntervalSlots: 100,
      stepEverySlots: 1_000,
    });
    const { market, burns } = fakeMarket(10n); // floor(10 * 1 / 10_000) = 0
    const event = mechanic.apply(ctx(100, market));
    expect(burns).toEqual([]);
    expect(event).toEqual({ slot: 100, mechanicId: "lpBurn", baseBurned: 0n, quoteSpent: 0n });
  });
});
