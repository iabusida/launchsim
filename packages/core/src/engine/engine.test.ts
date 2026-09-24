import { describe, it, expect } from "vitest";
import { runEngine } from "./engine.js";
import { createClock } from "./clock.js";
import { createRng } from "./rng.js";
import { createWallet } from "./wallet.js";
import type { Actor, Market, MechanicEvent, Mechanic, Order } from "../types.js";

/** A minimal in-memory Market for engine tests: a plain CPMM-like curve, no fees. */
function createFakeMarket(quoteReserve: bigint, baseReserve: bigint): Market {
  let quote = quoteReserve;
  let base = baseReserve;
  return {
    kind: "math/cpmm",
    state: () => ({ quoteReserve: quote, baseReserve: base, quoteFeesCollected: 0n }),
    quoteBuy: (quoteIn) => ({ amountOut: (quoteIn * base) / (quote + quoteIn), feeAmount: 0n }),
    quoteSell: (baseIn) => ({ amountOut: (baseIn * quote) / (base + baseIn), feeAmount: 0n }),
    buy: (order) => {
      const amountOut = (order.quoteIn * base) / (quote + order.quoteIn);
      if (amountOut < order.minBaseOut) {
        return { ok: false, reason: "slippage exceeded" };
      }
      quote += order.quoteIn;
      base -= amountOut;
      return { ok: true, amountOut, feeAmount: 0n };
    },
    sell: (order) => {
      const amountOut = (order.baseIn * quote) / (base + order.baseIn);
      if (amountOut < order.minQuoteOut) {
        return { ok: false, reason: "slippage exceeded" };
      }
      base += order.baseIn;
      quote -= amountOut;
      return { ok: true, amountOut, feeAmount: 0n };
    },
    burnFromPool: (baseAmount) => {
      base -= baseAmount;
    },
    withdrawFees: () => 0n,
  };
}

/** An actor that buys once with a fixed order, then does nothing. */
function createOneShotBuyer(id: string, priorityFee: bigint): Actor {
  let hasBought = false;
  return {
    id,
    group: "retail",
    decide(ctx) {
      if (hasBought) {
        return [];
      }
      hasBought = true;
      const order: Order = {
        actorId: id,
        group: "retail",
        side: "buy",
        priorityFee,
        reason: "test buy",
        buy: { quoteIn: ctx.wallet.quoteBalance, minBaseOut: 0n },
      };
      return [order];
    },
  };
}

describe("runEngine", () => {
  it("runs a single actor's buy order and updates the market and wallet", () => {
    const market = createFakeMarket(1_000_000n, 1_000_000n);
    const actor = createOneShotBuyer("buyer-1", 0n);
    const result = runEngine({
      market,
      mechanics: [],
      scheduledActors: [{ actor, slots: [0] }],
      initialWallets: new Map([["buyer-1", createWallet(10_000n)]]),
      duration: 10,
      sampleEvery: 5,
      clock: createClock(400),
      rng: createRng(42),
    });

    expect(result.trades).toHaveLength(1);
    expect(result.trades[0]).toMatchObject({ slot: 0, actorId: "buyer-1", side: "buy", ok: true });
    expect(result.wallets.get("buyer-1")?.quoteBalance).toBe(0n);
    expect(market.state().quoteReserve).toBe(1_010_000n);
  });

  it("orders within a slot by priority fee, higher first", () => {
    const market = createFakeMarket(10_000_000n, 10_000_000n);
    const low = createOneShotBuyer("low", 1n);
    const high = createOneShotBuyer("high", 100n);
    const result = runEngine({
      market,
      mechanics: [],
      // scheduled in "low, high" order, but high priority fee must still go first
      scheduledActors: [
        { actor: low, slots: [0] },
        { actor: high, slots: [0] },
      ],
      initialWallets: new Map([
        ["low", createWallet(1_000n)],
        ["high", createWallet(1_000n)],
      ]),
      duration: 10,
      sampleEvery: 5,
      clock: createClock(400),
      rng: createRng(42),
    });

    expect(result.trades.map((t) => t.actorId)).toEqual(["high", "low"]);
  });

  it("runs due mechanics after orders execute each slot", () => {
    const market = createFakeMarket(1_000_000n, 1_000_000n);
    const events: MechanicEvent[] = [];
    const mechanic: Mechanic = {
      id: "test-mechanic",
      due: (slot) => slot === 0,
      apply: (ctx) => {
        ctx.market.burnFromPool(1_000n);
        const event = { slot: ctx.slot, mechanicId: "test-mechanic", baseBurned: 1_000n, quoteSpent: 0n };
        events.push(event);
        return event;
      },
    };
    const result = runEngine({
      market,
      mechanics: [mechanic],
      scheduledActors: [],
      initialWallets: new Map(),
      duration: 10,
      sampleEvery: 5,
      clock: createClock(400),
      rng: createRng(42),
    });

    expect(result.mechanicEvents).toEqual([
      { slot: 0, mechanicId: "test-mechanic", baseBurned: 1_000n, quoteSpent: 0n },
    ]);
    expect(market.state().baseReserve).toBe(999_000n);
  });

  it("samples the timeline at the configured interval and tracks the peak quote reserve", () => {
    const market = createFakeMarket(1_000_000n, 1_000_000n);
    const actor = createOneShotBuyer("buyer-1", 0n);
    const result = runEngine({
      market,
      mechanics: [],
      scheduledActors: [{ actor, slots: [0] }],
      initialWallets: new Map([["buyer-1", createWallet(10_000n)]]),
      duration: 10,
      sampleEvery: 5,
      clock: createClock(400),
      rng: createRng(42),
    });

    expect(result.timeline.samples.map((s) => s.slot)).toEqual([0, 5, 10]);
    expect(result.timeline.peakQuoteReserve).toBe(1_010_000n);
  });

  it("fails a trade gracefully when the actor lacks the balance, without touching the market", () => {
    const market = createFakeMarket(1_000_000n, 1_000_000n);
    const overspender: Actor = {
      id: "overspender",
      group: "retail",
      decide: () => [
        {
          actorId: "overspender",
          group: "retail",
          side: "buy",
          priorityFee: 0n,
          reason: "test",
          buy: { quoteIn: 1_000_000n, minBaseOut: 0n }, // has only 100n
        },
      ],
    };
    const result = runEngine({
      market,
      mechanics: [],
      scheduledActors: [{ actor: overspender, slots: [0] }],
      initialWallets: new Map([["overspender", createWallet(100n)]]),
      duration: 10,
      sampleEvery: 5,
      clock: createClock(400),
      rng: createRng(42),
    });

    expect(result.trades[0]).toMatchObject({ ok: false, reason: "insufficient balance" });
    expect(market.state().quoteReserve).toBe(1_000_000n);
  });

  it("gives each scheduled actor its own forked Rng stream, stable across calls", () => {
    let seenFirst: number | undefined;
    let seenSecond: number | undefined;
    const rngActor: Actor = {
      id: "rng-actor",
      group: "retail",
      decide(ctx) {
        if (ctx.slot === 0) {
          seenFirst = ctx.rng.next();
        } else {
          seenSecond = ctx.rng.next();
        }
        return [];
      },
    };
    runEngine({
      market: createFakeMarket(1_000_000n, 1_000_000n),
      mechanics: [],
      scheduledActors: [{ actor: rngActor, slots: [0, 1] }],
      initialWallets: new Map(),
      duration: 10,
      sampleEvery: 5,
      clock: createClock(400),
      rng: createRng(42),
    });

    const direct = createRng(42).fork("rng-actor");
    expect(seenFirst).toBe(direct.next());
    expect(seenSecond).toBe(direct.next());
  });

  it("throws when duration is negative", () => {
    expect(() =>
      runEngine({
        market: createFakeMarket(1_000n, 1_000n),
        mechanics: [],
        scheduledActors: [],
        initialWallets: new Map(),
        duration: -1,
        sampleEvery: 5,
        clock: createClock(400),
        rng: createRng(42),
      }),
    ).toThrow(/non-negative/);
  });

  it("accepts a duration of exactly 0", () => {
    expect(() =>
      runEngine({
        market: createFakeMarket(1_000n, 1_000n),
        mechanics: [],
        scheduledActors: [],
        initialWallets: new Map(),
        duration: 0,
        sampleEvery: 5,
        clock: createClock(400),
        rng: createRng(42),
      }),
    ).not.toThrow();
  });

  it("advances the clock to each processed slot", () => {
    const clock = createClock(400);
    runEngine({
      market: createFakeMarket(1_000n, 1_000n),
      mechanics: [],
      scheduledActors: [],
      initialWallets: new Map(),
      duration: 10,
      sampleEvery: 5,
      clock,
      rng: createRng(42),
    });
    expect(clock.now()).toBe(10);
  });

  it("orders three actors by priority fee even when scheduled out of order", () => {
    const market = createFakeMarket(10_000_000n, 10_000_000n);
    const low = createOneShotBuyer("low", 1n);
    const mid = createOneShotBuyer("mid", 5n);
    const high = createOneShotBuyer("high", 10n);
    const result = runEngine({
      market,
      mechanics: [],
      scheduledActors: [
        { actor: low, slots: [0] },
        { actor: mid, slots: [0] },
        { actor: high, slots: [0] },
      ],
      initialWallets: new Map([
        ["low", createWallet(1_000n)],
        ["mid", createWallet(1_000n)],
        ["high", createWallet(1_000n)],
      ]),
      duration: 10,
      sampleEvery: 5,
      clock: createClock(400),
      rng: createRng(42),
    });
    expect(result.trades.map((t) => t.actorId)).toEqual(["high", "mid", "low"]);
  });

  it("preserves scheduling order when two orders have equal priority fee", () => {
    const market = createFakeMarket(10_000_000n, 10_000_000n);
    const first = createOneShotBuyer("first", 5n);
    const second = createOneShotBuyer("second", 5n);
    const result = runEngine({
      market,
      mechanics: [],
      scheduledActors: [
        { actor: first, slots: [0] },
        { actor: second, slots: [0] },
      ],
      initialWallets: new Map([
        ["first", createWallet(1_000n)],
        ["second", createWallet(1_000n)],
      ]),
      duration: 10,
      sampleEvery: 5,
      clock: createClock(400),
      rng: createRng(42),
    });
    expect(result.trades.map((t) => t.actorId)).toEqual(["first", "second"]);
  });

  it("fills a sell order, updating the market and wallet", () => {
    const market = createFakeMarket(1_000_000n, 1_000_000n);
    const seller: Actor = {
      id: "seller",
      group: "retail",
      decide: (ctx) =>
        ctx.wallet.baseBalance > 0n
          ? [
              {
                actorId: "seller",
                group: "retail",
                side: "sell",
                priorityFee: 0n,
                reason: "test sell",
                sell: { baseIn: ctx.wallet.baseBalance, minQuoteOut: 0n },
              },
            ]
          : [],
    };
    const wallet = { quoteBalance: 0n, baseBalance: 9_802n, entryPrice: null };
    const result = runEngine({
      market,
      mechanics: [],
      scheduledActors: [{ actor: seller, slots: [0] }],
      initialWallets: new Map([["seller", wallet]]),
      duration: 10,
      sampleEvery: 5,
      clock: createClock(400),
      rng: createRng(42),
    });
    expect(result.trades[0]).toMatchObject({ side: "sell", ok: true, base: 9_802n });
    expect(result.wallets.get("seller")?.baseBalance).toBe(0n);
  });

  it("records a rejected buy outcome from the market (e.g. slippage)", () => {
    const market = createFakeMarket(1_000_000n, 1_000_000n);
    const slippageBuyer: Actor = {
      id: "buyer",
      group: "retail",
      decide: () => [
        {
          actorId: "buyer",
          group: "retail",
          side: "buy",
          priorityFee: 0n,
          reason: "test",
          buy: { quoteIn: 10_000n, minBaseOut: 1_000_000_000n }, // impossible minOut
        },
      ],
    };
    const result = runEngine({
      market,
      mechanics: [],
      scheduledActors: [{ actor: slippageBuyer, slots: [0] }],
      initialWallets: new Map([["buyer", createWallet(10_000n)]]),
      duration: 10,
      sampleEvery: 5,
      clock: createClock(400),
      rng: createRng(42),
    });
    expect(result.trades[0]).toMatchObject({ ok: false, reason: "slippage exceeded" });
  });

  it("fails a sell gracefully when the actor lacks the base balance", () => {
    const market = createFakeMarket(1_000_000n, 1_000_000n);
    const overseller: Actor = {
      id: "overseller",
      group: "retail",
      decide: () => [
        {
          actorId: "overseller",
          group: "retail",
          side: "sell",
          priorityFee: 0n,
          reason: "test",
          sell: { baseIn: 1_000n, minQuoteOut: 0n }, // has 0 base
        },
      ],
    };
    const result = runEngine({
      market,
      mechanics: [],
      scheduledActors: [{ actor: overseller, slots: [0] }],
      initialWallets: new Map([["overseller", createWallet(0n)]]),
      duration: 10,
      sampleEvery: 5,
      clock: createClock(400),
      rng: createRng(42),
    });
    expect(result.trades[0]).toMatchObject({ ok: false, reason: "insufficient balance" });
  });

  it("records a rejected sell outcome from the market (e.g. slippage)", () => {
    const market = createFakeMarket(1_000_000n, 1_000_000n);
    const slippageSeller: Actor = {
      id: "seller",
      group: "retail",
      decide: () => [
        {
          actorId: "seller",
          group: "retail",
          side: "sell",
          priorityFee: 0n,
          reason: "test",
          sell: { baseIn: 10_000n, minQuoteOut: 1_000_000_000n }, // impossible minOut
        },
      ],
    };
    const wallet = { quoteBalance: 0n, baseBalance: 10_000n, entryPrice: null };
    const result = runEngine({
      market,
      mechanics: [],
      scheduledActors: [{ actor: slippageSeller, slots: [0] }],
      initialWallets: new Map([["seller", wallet]]),
      duration: 10,
      sampleEvery: 5,
      clock: createClock(400),
      rng: createRng(42),
    });
    expect(result.trades[0]).toMatchObject({ ok: false, reason: "slippage exceeded" });
  });

  it("records a malformed order (side without a matching buy/sell payload) as rejected", () => {
    const market = createFakeMarket(1_000_000n, 1_000_000n);
    const confusedActor: Actor = {
      id: "confused",
      group: "retail",
      decide: () => [
        { actorId: "confused", group: "retail", side: "buy", priorityFee: 0n, reason: "oops" },
      ],
    };
    const result = runEngine({
      market,
      mechanics: [],
      scheduledActors: [{ actor: confusedActor, slots: [0] }],
      initialWallets: new Map([["confused", createWallet(1_000n)]]),
      duration: 10,
      sampleEvery: 5,
      clock: createClock(400),
      rng: createRng(42),
    });
    expect(result.trades[0]).toMatchObject({ ok: false, reason: "malformed order" });
  });

  it("rejects a sell-side order that carries a buy payload instead of sell", () => {
    const market = createFakeMarket(1_000_000n, 1_000_000n);
    const confusedActor: Actor = {
      id: "confused",
      group: "retail",
      decide: () => [
        {
          actorId: "confused",
          group: "retail",
          side: "sell",
          priorityFee: 0n,
          reason: "oops",
          buy: { quoteIn: 100n, minBaseOut: 0n },
        },
      ],
    };
    const result = runEngine({
      market,
      mechanics: [],
      scheduledActors: [{ actor: confusedActor, slots: [0] }],
      initialWallets: new Map([["confused", createWallet(1_000n)]]),
      duration: 10,
      sampleEvery: 5,
      clock: createClock(400),
      rng: createRng(42),
    });
    expect(result.trades[0]).toMatchObject({ ok: false, reason: "malformed order" });
    expect(market.state().quoteReserve).toBe(1_000_000n); // never touched
  });

  it("rejects a buy-side order that carries a sell payload instead of buy", () => {
    const market = createFakeMarket(1_000_000n, 1_000_000n);
    const confusedActor: Actor = {
      id: "confused",
      group: "retail",
      decide: () => [
        {
          actorId: "confused",
          group: "retail",
          side: "buy",
          priorityFee: 0n,
          reason: "oops",
          sell: { baseIn: 100n, minQuoteOut: 0n },
        },
      ],
    };
    const result = runEngine({
      market,
      mechanics: [],
      scheduledActors: [{ actor: confusedActor, slots: [0] }],
      initialWallets: new Map([["confused", createWallet(1_000n)]]),
      duration: 10,
      sampleEvery: 5,
      clock: createClock(400),
      rng: createRng(42),
    });
    expect(result.trades[0]).toMatchObject({ ok: false, reason: "malformed order" });
    expect(market.state().quoteReserve).toBe(1_000_000n); // never touched
  });

  it("ignores an actor scheduled beyond the scenario's duration", () => {
    const market = createFakeMarket(1_000_000n, 1_000_000n);
    const lateActor = createOneShotBuyer("late", 0n);
    const result = runEngine({
      market,
      mechanics: [],
      scheduledActors: [{ actor: lateActor, slots: [100] }], // duration is only 10
      initialWallets: new Map([["late", createWallet(1_000n)]]),
      duration: 10,
      sampleEvery: 5,
      clock: createClock(400),
      rng: createRng(42),
    });
    expect(result.trades).toEqual([]);
  });

  it("defaults an actor with no registered wallet to an empty one", () => {
    const market = createFakeMarket(1_000_000n, 1_000_000n);
    const actor = createOneShotBuyer("no-wallet", 0n);
    const result = runEngine({
      market,
      mechanics: [],
      scheduledActors: [{ actor, slots: [0] }],
      initialWallets: new Map(), // "no-wallet" is never registered
      duration: 10,
      sampleEvery: 5,
      clock: createClock(400),
      rng: createRng(42),
    });
    // The order asks to spend ctx.wallet.quoteBalance, which is 0 for an
    // unregistered wallet; the trade fills as a (trivial) zero-amount buy
    // without crashing, and the wallet stays empty.
    expect(result.trades[0]).toMatchObject({ ok: true, quote: 0n, base: 0n });
    expect(result.wallets.get("no-wallet")).toEqual({
      quoteBalance: 0n,
      baseBalance: 0n,
      entryPrice: null,
    });
  });

  it("is deterministic: the same config produces the same result", () => {
    function run() {
      const actor = createOneShotBuyer("buyer-1", 0n);
      return runEngine({
        market: createFakeMarket(1_000_000n, 1_000_000n),
        mechanics: [],
        scheduledActors: [{ actor, slots: [0] }],
        initialWallets: new Map([["buyer-1", createWallet(10_000n)]]),
        duration: 10,
        sampleEvery: 5,
        clock: createClock(400),
        rng: createRng(42),
      });
    }
    expect(run()).toEqual(run());
  });
});
