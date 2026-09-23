import { describe, it, expect } from "vitest";
import { createFeeBuybackMechanic } from "./fee-buyback.js";
import type { Market, MechanicContext, TradeOutcome } from "../types.js";

function fakeMarket(opts: {
  feesToWithdraw: bigint;
  buyOutcome: TradeOutcome;
}): { market: Market; burns: bigint[]; buyCalls: bigint[] } {
  const burns: bigint[] = [];
  const buyCalls: bigint[] = [];
  const market: Market = {
    kind: "math/cpmm",
    state: () => ({ quoteReserve: 1_000_000n, baseReserve: 1_000_000n, quoteFeesCollected: 0n }),
    quoteBuy: () => ({ amountOut: 0n, feeAmount: 0n }),
    quoteSell: () => ({ amountOut: 0n, feeAmount: 0n }),
    buy: (order) => {
      buyCalls.push(order.quoteIn);
      return opts.buyOutcome;
    },
    sell: () => ({ ok: false, reason: "n/a" }),
    burnFromPool: (baseAmount) => {
      burns.push(baseAmount);
    },
    withdrawFees: () => opts.feesToWithdraw,
  };
  return { market, burns, buyCalls };
}

function ctx(slot: number, market: Market): MechanicContext {
  return { slot, market };
}

describe("createFeeBuybackMechanic", () => {
  it("is due every intervalSlots, starting after slot 0", () => {
    const mechanic = createFeeBuybackMechanic("feeBuyback", {
      intervalSlots: 100,
      feeShareBps: 10_000n,
      minBuy: 0n,
    });
    expect(mechanic.due(0)).toBe(false);
    expect(mechanic.due(99)).toBe(false);
    expect(mechanic.due(100)).toBe(true);
  });

  it("withdraws fees, buys with feeShareBps of them, and burns the purchased base", () => {
    const mechanic = createFeeBuybackMechanic("feeBuyback", {
      intervalSlots: 100,
      feeShareBps: 5_000n, // 50%
      minBuy: 0n,
    });
    const { market, burns, buyCalls } = fakeMarket({
      feesToWithdraw: 10_000n,
      buyOutcome: { ok: true, amountOut: 4_000n, feeAmount: 50n },
    });
    const event = mechanic.apply(ctx(100, market));
    expect(buyCalls).toEqual([5_000n]); // 50% of 10_000
    expect(burns).toEqual([4_000n]);
    expect(event).toEqual({ slot: 100, mechanicId: "feeBuyback", baseBurned: 4_000n, quoteSpent: 5_000n });
  });

  it("skips the buy when the share is below minBuy (dust)", () => {
    const mechanic = createFeeBuybackMechanic("feeBuyback", {
      intervalSlots: 100,
      feeShareBps: 10_000n,
      minBuy: 1_000n,
    });
    const { market, burns, buyCalls } = fakeMarket({
      feesToWithdraw: 500n,
      buyOutcome: { ok: true, amountOut: 100n, feeAmount: 0n },
    });
    const event = mechanic.apply(ctx(100, market));
    expect(buyCalls).toEqual([]);
    expect(burns).toEqual([]);
    expect(event).toEqual({ slot: 100, mechanicId: "feeBuyback", baseBurned: 0n, quoteSpent: 0n });
  });

  it("skips the burn when the buy itself fails (e.g. slippage)", () => {
    const mechanic = createFeeBuybackMechanic("feeBuyback", {
      intervalSlots: 100,
      feeShareBps: 10_000n,
      minBuy: 0n,
    });
    const { market, burns } = fakeMarket({
      feesToWithdraw: 10_000n,
      buyOutcome: { ok: false, reason: "slippage exceeded" },
    });
    const event = mechanic.apply(ctx(100, market));
    expect(burns).toEqual([]);
    expect(event).toEqual({ slot: 100, mechanicId: "feeBuyback", baseBurned: 0n, quoteSpent: 0n });
  });

  it("skips the burn when the buy succeeds but yields zero base (dust rounding)", () => {
    const mechanic = createFeeBuybackMechanic("feeBuyback", {
      intervalSlots: 100,
      feeShareBps: 10_000n,
      minBuy: 0n,
    });
    const { market, burns } = fakeMarket({
      feesToWithdraw: 10_000n,
      buyOutcome: { ok: true, amountOut: 0n, feeAmount: 0n },
    });
    const event = mechanic.apply(ctx(100, market));
    expect(burns).toEqual([]);
    expect(event).toEqual({ slot: 100, mechanicId: "feeBuyback", baseBurned: 0n, quoteSpent: 10_000n });
  });

  it("skips entirely when there are no fees to withdraw", () => {
    const mechanic = createFeeBuybackMechanic("feeBuyback", {
      intervalSlots: 100,
      feeShareBps: 10_000n,
      minBuy: 0n,
    });
    const { market, buyCalls } = fakeMarket({
      feesToWithdraw: 0n,
      buyOutcome: { ok: true, amountOut: 0n, feeAmount: 0n },
    });
    const event = mechanic.apply(ctx(100, market));
    expect(buyCalls).toEqual([]);
    expect(event).toEqual({ slot: 100, mechanicId: "feeBuyback", baseBurned: 0n, quoteSpent: 0n });
  });
});
