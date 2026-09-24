import { describe, it, expect } from "vitest";
import { createPanicSellerActors } from "./panic-seller.js";
import { createRng } from "../engine/rng.js";
import { price } from "../math/price.js";
import type { ActorContext } from "../types.js";

const config = { holdingsMin: 1_000n, holdingsMax: 10_000n, triggerDrawdownBps: 3_000n };

function ctxAt(
  quoteReserve: bigint,
  peakQuoteReserve: bigint,
  baseBalance: bigint,
): ActorContext {
  return {
    slot: 0,
    market: {
      state: { quoteReserve, baseReserve: 1_000_000n, quoteFeesCollected: 0n },
      price: price(quoteReserve, 1_000_000n),
      peakQuoteReserve,
    },
    wallet: { quoteBalance: 0n, baseBalance, entryPrice: null },
    rng: createRng(1),
  };
}

describe("createPanicSellerActors", () => {
  it("creates `count` distinct actors, each pre-funded with sampled holdings", () => {
    const { scheduled, initialWallets } = createPanicSellerActors(config, 3, 200_000, 1_000, createRng(42));
    expect(scheduled.map((s) => s.actor.id)).toEqual(["panicSeller-0", "panicSeller-1", "panicSeller-2"]);
    for (const { actor } of scheduled) {
      expect(actor.group).toBe("panicSeller");
      const wallet = initialWallets.get(actor.id);
      expect(wallet?.baseBalance).toBeGreaterThanOrEqual(config.holdingsMin);
      expect(wallet?.baseBalance).toBeLessThanOrEqual(config.holdingsMax);
      expect(wallet?.quoteBalance).toBe(0n);
    }
  });

  it("monitors every actor from slot 0 through duration", () => {
    const { scheduled } = createPanicSellerActors(config, 1, 200_000, 1_000, createRng(42));
    expect(scheduled[0]?.slots[0]).toBe(0);
    expect(scheduled[0]?.slots.at(-1)).toBe(200_000);
  });

  it("does nothing below the drawdown threshold", () => {
    const { scheduled } = createPanicSellerActors(config, 1, 200_000, 1_000, createRng(42));
    // 20% drawdown, threshold is 30%
    const ctx = ctxAt(800_000n, 1_000_000n, 5_000n);
    expect(scheduled[0]?.actor.decide(ctx)).toEqual([]);
  });

  it("sells everything once drawdown from peak reaches the trigger", () => {
    const { scheduled } = createPanicSellerActors(config, 1, 200_000, 1_000, createRng(42));
    const id = scheduled[0]?.actor.id ?? "";
    // exactly 30% drawdown
    const ctx = ctxAt(700_000n, 1_000_000n, 5_000n);
    expect(scheduled[0]?.actor.decide(ctx)).toEqual([
      {
        actorId: id,
        group: "panicSeller",
        side: "sell",
        priorityFee: 0n,
        reason: "panic sell: drawdown trigger",
        sell: { baseIn: 5_000n, minQuoteOut: 0n },
      },
    ]);
  });

  it("does nothing once already sold out (no base balance)", () => {
    const { scheduled } = createPanicSellerActors(config, 1, 200_000, 1_000, createRng(42));
    const ctx = ctxAt(700_000n, 1_000_000n, 0n);
    expect(scheduled[0]?.actor.decide(ctx)).toEqual([]);
  });
});
