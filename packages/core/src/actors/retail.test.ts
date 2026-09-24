import { describe, it, expect } from "vitest";
import { createRetailActors } from "./retail.js";
import { createRng } from "../engine/rng.js";
import { createWallet } from "../engine/wallet.js";
import { price } from "../math/price.js";
import type { ActorContext } from "../types.js";
import type { Rng } from "../engine/rng.js";

const config = {
  spendMin: 100_000_000n,
  spendMax: 1_000_000_000n,
  overSlots: 90_000,
  takeProfitX: 2,
  stopLossMultiplier: 0.5,
  sellProbabilityBps: 10_000n, // always sell when triggered, for deterministic tests
};

function ctxAt(slot: number, rng: Rng, overrides: Partial<ActorContext> = {}): ActorContext {
  return {
    slot,
    market: {
      state: { quoteReserve: 1_000_000n, baseReserve: 1_000_000n, quoteFeesCollected: 0n },
      price: price(1n, 1n),
      peakQuoteReserve: 1_000_000n,
    },
    wallet: createWallet(1_000_000_000n),
    rng,
    ...overrides,
  };
}

describe("createRetailActors", () => {
  it("creates `count` distinct scheduled actors with distinct ids", () => {
    const scheduled = createRetailActors(config, 3, 200_000, 1_000, createRng(42));
    expect(scheduled.map((s) => s.actor.id)).toEqual(["retail-0", "retail-1", "retail-2"]);
  });

  it("samples each actor's arrival slot within [0, overSlots]", () => {
    const scheduled = createRetailActors(config, 5, 200_000, 1_000, createRng(42));
    for (const { actor, slots } of scheduled) {
      const arrival = slots[0] ?? -1;
      expect(arrival).toBeGreaterThanOrEqual(0);
      expect(arrival).toBeLessThanOrEqual(config.overSlots);
      expect(actor.decide(ctxAt(arrival, createRng(1)))).toHaveLength(1);
    }
  });

  it("buys once at the arrival slot", () => {
    const [retail] = createRetailActors({ ...config, overSlots: 0 }, 1, 0, 1_000, createRng(42)); // overSlots 0 -> arrival always 0
    expect(retail?.actor.group).toBe("retail");
    const orders = retail?.actor.decide(ctxAt(0, createRng(1)));
    expect(orders).toHaveLength(1);
    expect(orders?.[0]).toMatchObject({
      actorId: "retail-0",
      group: "retail",
      side: "buy",
      reason: "retail entry",
    });
  });

  it("does nothing when not holding base, even with a stale entry price and a reached profit target", () => {
    const [retail] = createRetailActors({ ...config, overSlots: 0 }, 1, 0, 1_000, createRng(42));
    const notHolding = ctxAt(1_000, createRng(1), {
      market: {
        state: { quoteReserve: 2_000_000n, baseReserve: 1_000_000n, quoteFeesCollected: 0n },
        price: price(2n, 1n),
        peakQuoteReserve: 2_000_000n,
      },
      wallet: { quoteBalance: 1_000_000_000n, baseBalance: 0n, entryPrice: price(1n, 1n) },
    });
    expect(retail?.actor.decide(notHolding)).toEqual([]);
  });

  it("does not buy again at the arrival slot if somehow already holding", () => {
    const [retail] = createRetailActors({ ...config, overSlots: 0 }, 1, 0, 1_000, createRng(42));
    const alreadyHolding = ctxAt(0, createRng(1), {
      wallet: { quoteBalance: 0n, baseBalance: 1_000n, entryPrice: price(1n, 1n) },
    });
    expect(retail?.actor.decide(alreadyHolding)).toEqual([]);
  });

  it("does not buy on a slot other than its arrival slot", () => {
    const [retail] = createRetailActors({ ...config, overSlots: 0 }, 1, 0, 1_000, createRng(42));
    expect(retail?.actor.decide(ctxAt(1, createRng(1)))).toEqual([]);
  });

  it("does not buy again once already holding", () => {
    const [retail] = createRetailActors({ ...config, overSlots: 0 }, 1, 0, 1_000, createRng(42));
    const holding = ctxAt(1_000, createRng(1), {
      wallet: { quoteBalance: 0n, baseBalance: 1_000n, entryPrice: price(1n, 1n) },
    });
    // not at profit/loss target, still holds -> no order
    expect(retail?.actor.decide(holding)).toEqual([]);
  });

  it("sells on reaching takeProfitX when the probability roll succeeds", () => {
    const [retail] = createRetailActors({ ...config, overSlots: 0 }, 1, 0, 1_000, createRng(42));
    const holding = ctxAt(1_000, createRng(1), {
      market: {
        state: { quoteReserve: 2_000_000n, baseReserve: 1_000_000n, quoteFeesCollected: 0n },
        price: price(2n, 1n),
        peakQuoteReserve: 2_000_000n,
      },
      wallet: { quoteBalance: 0n, baseBalance: 1_000n, entryPrice: price(1n, 1n) },
    });
    expect(retail?.actor.decide(holding)).toEqual([
      {
        actorId: "retail-0",
        group: "retail",
        side: "sell",
        priorityFee: 0n,
        reason: "retail exit: take profit",
        sell: { baseIn: 1_000n, minQuoteOut: 0n },
      },
    ]);
  });

  it("sells on dropping to the stop-loss multiplier", () => {
    const [retail] = createRetailActors({ ...config, overSlots: 0 }, 1, 0, 1_000, createRng(42));
    const holding = ctxAt(1_000, createRng(1), {
      market: {
        state: { quoteReserve: 500_000n, baseReserve: 1_000_000n, quoteFeesCollected: 0n },
        price: price(1n, 2n),
        peakQuoteReserve: 1_000_000n,
      },
      wallet: { quoteBalance: 0n, baseBalance: 1_000n, entryPrice: price(1n, 1n) },
    });
    expect(retail?.actor.decide(holding)).toEqual([
      {
        actorId: "retail-0",
        group: "retail",
        side: "sell",
        priorityFee: 0n,
        reason: "retail exit: stop loss",
        sell: { baseIn: 1_000n, minQuoteOut: 0n },
      },
    ]);
  });

  it("does not sell exactly at the probability boundary (roll >= threshold)", () => {
    const halfChance = { ...config, overSlots: 0, sellProbabilityBps: 5_000n };
    const [retail] = createRetailActors(halfChance, 1, 0, 1_000, createRng(42));
    const stubRng = { next: () => 0.5, nextInt: () => 0, fork: () => stubRng };
    const holding = ctxAt(1_000, stubRng, {
      market: {
        state: { quoteReserve: 2_000_000n, baseReserve: 1_000_000n, quoteFeesCollected: 0n },
        price: price(2n, 1n),
        peakQuoteReserve: 2_000_000n,
      },
      wallet: { quoteBalance: 0n, baseBalance: 1_000n, entryPrice: price(1n, 1n) },
    });
    expect(retail?.actor.decide(holding)).toEqual([]);
  });

  it("does not sell when triggered but the probability roll fails", () => {
    const neverSell = { ...config, overSlots: 0, sellProbabilityBps: 0n };
    const [retail] = createRetailActors(neverSell, 1, 0, 1_000, createRng(42));
    const holding = ctxAt(1_000, createRng(1), {
      market: {
        state: { quoteReserve: 2_000_000n, baseReserve: 1_000_000n, quoteFeesCollected: 0n },
        price: price(2n, 1n),
        peakQuoteReserve: 2_000_000n,
      },
      wallet: { quoteBalance: 0n, baseBalance: 1_000n, entryPrice: price(1n, 1n) },
    });
    expect(retail?.actor.decide(holding)).toEqual([]);
  });

  it("does nothing when holding base but somehow has no entry price recorded", () => {
    const [retail] = createRetailActors({ ...config, overSlots: 0 }, 1, 0, 1_000, createRng(42));
    const holding = ctxAt(1_000, createRng(1), {
      wallet: { quoteBalance: 0n, baseBalance: 1_000n, entryPrice: null },
    });
    expect(retail?.actor.decide(holding)).toEqual([]);
  });
});
