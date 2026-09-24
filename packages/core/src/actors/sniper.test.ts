import { describe, it, expect } from "vitest";
import { createSniperActors } from "./sniper.js";
import { createRng } from "../engine/rng.js";
import { createWallet } from "../engine/wallet.js";
import { price } from "../math/price.js";
import type { ActorContext } from "../types.js";

const config = { spendMin: 1_000_000_000n, spendMax: 2_000_000_000n, at: 0, priorityFee: 1_000n, holdSlots: 150, sellAtX: 2 };

function ctxAt(slot: number, overrides: Partial<ActorContext> = {}): ActorContext {
  return {
    slot,
    market: {
      state: { quoteReserve: 1_000_000n, baseReserve: 1_000_000n, quoteFeesCollected: 0n },
      price: price(1n, 1n),
      peakQuoteReserve: 1_000_000n,
    },
    wallet: createWallet(2_000_000_000n),
    rng: createRng(1),
    ...overrides,
  };
}

describe("createSniperActors", () => {
  it("creates `count` distinct scheduled actors with distinct ids", () => {
    const scheduled = createSniperActors(config, 3, 1_000, createRng(42));
    expect(scheduled.map((s) => s.actor.id)).toEqual(["sniper-0", "sniper-1", "sniper-2"]);
  });

  it("schedules each actor at the entry slot and every slot through holdSlots", () => {
    const [sniper] = createSniperActors(config, 1, 1_000, createRng(42));
    expect(sniper?.slots[0]).toBe(0);
    expect(sniper?.slots.at(-1)).toBe(150);
    expect(sniper?.slots).toHaveLength(151);
  });

  it("buys with the configured priority fee at the entry slot", () => {
    const [sniper] = createSniperActors(config, 1, 1_000, createRng(42));
    expect(sniper?.actor.group).toBe("sniper");
    const orders = sniper?.actor.decide(ctxAt(0));
    expect(orders).toHaveLength(1);
    expect(orders?.[0]).toMatchObject({
      actorId: "sniper-0",
      group: "sniper",
      side: "buy",
      priorityFee: 1_000n,
      reason: "sniper entry",
    });
  });

  it("samples spend within [spendMin, spendMax], deterministically per seed", () => {
    const [sniper] = createSniperActors(config, 1, 1_000, createRng(42));
    const orders = sniper?.actor.decide(ctxAt(0));
    const spend = orders?.[0]?.buy?.quoteIn ?? -1n;
    expect(spend >= config.spendMin && spend <= config.spendMax).toBe(true);
  });

  it("force-sells at holdSlots even without reaching the price target", () => {
    const [sniper] = createSniperActors(config, 1, 1_000, createRng(42));
    const holding = ctxAt(150, {
      wallet: { quoteBalance: 0n, baseBalance: 1_000n, entryPrice: price(1n, 1n) },
    });
    const orders = sniper?.actor.decide(holding);
    expect(orders).toEqual([
      {
        actorId: "sniper-0",
        group: "sniper",
        side: "sell",
        priorityFee: 1_000n,
        reason: "sniper exit: holdSlots elapsed",
        sell: { baseIn: 1_000n, minQuoteOut: 0n },
      },
    ]);
  });

  it("sells early once the price reaches sellAtX, before holdSlots", () => {
    const [sniper] = createSniperActors(config, 1, 1_000, createRng(42));
    const holding = ctxAt(10, {
      market: {
        state: { quoteReserve: 2_000_000n, baseReserve: 1_000_000n, quoteFeesCollected: 0n },
        price: price(2n, 1n),
        peakQuoteReserve: 2_000_000n,
      },
      wallet: { quoteBalance: 0n, baseBalance: 1_000n, entryPrice: price(1n, 1n) },
    });
    const orders = sniper?.actor.decide(holding);
    expect(orders).toEqual([
      {
        actorId: "sniper-0",
        group: "sniper",
        side: "sell",
        priorityFee: 1_000n,
        reason: "sniper exit: 2x target",
        sell: { baseIn: 1_000n, minQuoteOut: 0n },
      },
    ]);
  });

  it("does nothing when holding base but somehow has no entry price recorded", () => {
    const [sniper] = createSniperActors(config, 1, 1_000, createRng(42));
    const holding = ctxAt(10, {
      wallet: { quoteBalance: 0n, baseBalance: 1_000n, entryPrice: null },
    });
    expect(sniper?.actor.decide(holding)).toEqual([]);
  });

  it("does nothing while holding, before the target or holdSlots", () => {
    const [sniper] = createSniperActors(config, 1, 1_000, createRng(42));
    const holding = ctxAt(10, {
      wallet: { quoteBalance: 0n, baseBalance: 1_000n, entryPrice: price(1n, 1n) },
    });
    expect(sniper?.actor.decide(holding)).toEqual([]);
  });

  it("does not buy at a slot other than the entry slot even when not holding", () => {
    const [sniper] = createSniperActors(config, 1, 1_000, createRng(42));
    expect(sniper?.actor.decide(ctxAt(5))).toEqual([]);
  });

  it("does not buy again at the entry slot if already holding", () => {
    const [sniper] = createSniperActors(config, 1, 1_000, createRng(42));
    const alreadyHolding = ctxAt(0, {
      wallet: { quoteBalance: 0n, baseBalance: 1_000n, entryPrice: price(1n, 1n) },
    });
    expect(sniper?.actor.decide(alreadyHolding)).toEqual([]);
  });

  it("does nothing when not holding base, even with a stale entry price and a reached sell target", () => {
    const [sniper] = createSniperActors(config, 1, 1_000, createRng(42));
    const notHolding = ctxAt(10, {
      market: {
        state: { quoteReserve: 2_000_000n, baseReserve: 1_000_000n, quoteFeesCollected: 0n },
        price: price(2n, 1n),
        peakQuoteReserve: 2_000_000n,
      },
      wallet: { quoteBalance: 2_000_000_000n, baseBalance: 0n, entryPrice: price(1n, 1n) },
    });
    expect(sniper?.actor.decide(notHolding)).toEqual([]);
  });
});
