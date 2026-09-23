import { describe, it, expect } from "vitest";
import { createWhaleActor } from "./whale.js";
import { createWallet } from "../engine/wallet.js";
import { price } from "../math/price.js";
import type { ActorContext } from "../types.js";

const config = { spend: 50_000_000_000n, at: 75_000, sellAtX: 3 };

function ctxAt(slot: number, overrides: Partial<ActorContext> = {}): ActorContext {
  return {
    slot,
    market: {
      state: { quoteReserve: 1_000_000n, baseReserve: 1_000_000n, quoteFeesCollected: 0n },
      price: price(1n, 1n),
      peakQuoteReserve: 1_000_000n,
    },
    wallet: createWallet(50_000_000_000n),
    rng: { next: () => 0.5, nextInt: () => 0, fork: () => ctxAt(slot).rng },
    ...overrides,
  };
}

describe("createWhaleActor", () => {
  it("schedules entry at `at` and monitors until duration", () => {
    const scheduled = createWhaleActor("whale-0", config, 200_000, 1_000);
    expect(scheduled.slots[0]).toBe(75_000);
    expect(scheduled.slots.at(-1)).toBe(200_000);
  });

  it("buys the full spend at the entry slot", () => {
    const scheduled = createWhaleActor("whale-0", config, 200_000, 1_000);
    const orders = scheduled.actor.decide(ctxAt(75_000));
    expect(orders).toEqual([
      {
        actorId: "whale-0",
        group: "whale",
        side: "buy",
        priorityFee: 0n,
        reason: "whale entry",
        buy: { quoteIn: 50_000_000_000n, minBaseOut: 0n },
      },
    ]);
  });

  it("does nothing before the entry slot", () => {
    const scheduled = createWhaleActor("whale-0", config, 200_000, 1_000);
    expect(scheduled.actor.decide(ctxAt(75_000 - 1_000))).toEqual([]);
  });

  it("does nothing once already holding, before the sell target", () => {
    const scheduled = createWhaleActor("whale-0", config, 200_000, 1_000);
    const holding = ctxAt(76_000, {
      wallet: { quoteBalance: 0n, baseBalance: 50_000n, entryPrice: price(1n, 1n) },
    });
    expect(scheduled.actor.decide(holding)).toEqual([]);
  });

  it("sells everything once the price reaches sellAtX times the entry price", () => {
    const scheduled = createWhaleActor("whale-0", config, 200_000, 1_000);
    const holding = ctxAt(77_000, {
      market: {
        state: { quoteReserve: 3_000_000n, baseReserve: 1_000_000n, quoteFeesCollected: 0n },
        price: price(3n, 1n), // 3x the entry price of 1
        peakQuoteReserve: 3_000_000n,
      },
      wallet: { quoteBalance: 0n, baseBalance: 50_000n, entryPrice: price(1n, 1n) },
    });
    expect(scheduled.actor.decide(holding)).toEqual([
      {
        actorId: "whale-0",
        group: "whale",
        side: "sell",
        priorityFee: 0n,
        reason: "whale exit: 3x target",
        sell: { baseIn: 50_000n, minQuoteOut: 0n },
      },
    ]);
  });
});
