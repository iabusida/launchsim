import { describe, it, expect } from "vitest";
import { runEngine } from "../src/engine/engine.js";
import { createClock } from "../src/engine/clock.js";
import { createRng } from "../src/engine/rng.js";
import { createWallet } from "../src/engine/wallet.js";
import { createRetailActors } from "../src/actors/retail.js";
import { createSniperActors } from "../src/actors/sniper.js";
import { createWhaleActor } from "../src/actors/whale.js";
import type { EngineResult } from "../src/engine/engine.js";
import type { Market } from "../src/types.js";

/**
 * A minimal constant-product market, defined locally rather than imported
 * from `@launchsim/adapters` -- `core` depends on nothing internal
 * (docs/01), so its own tests can't reach into a package that depends on it.
 */
function createFakeMarket(quoteReserve: bigint, baseReserve: bigint): Market {
  let quote = quoteReserve;
  let base = baseReserve;
  const feeBps = 100n;
  return {
    kind: "math/cpmm",
    state: () => ({ quoteReserve: quote, baseReserve: base, quoteFeesCollected: 0n }),
    quoteBuy: (quoteIn) => ({ amountOut: (quoteIn * base) / (quote + quoteIn), feeAmount: 0n }),
    quoteSell: (baseIn) => ({ amountOut: (baseIn * quote) / (base + baseIn), feeAmount: 0n }),
    buy: (order) => {
      const fee = (order.quoteIn * feeBps) / 10_000n;
      const net = order.quoteIn - fee;
      const amountOut = (net * base) / (quote + net);
      if (amountOut < order.minBaseOut) {
        return { ok: false, reason: "slippage exceeded" };
      }
      quote += order.quoteIn;
      base -= amountOut;
      return { ok: true, amountOut, feeAmount: fee };
    },
    sell: (order) => {
      const raw = (order.baseIn * quote) / (base + order.baseIn);
      const fee = (raw * feeBps) / 10_000n;
      const amountOut = raw - fee;
      if (amountOut < order.minQuoteOut) {
        return { ok: false, reason: "slippage exceeded" };
      }
      base += order.baseIn;
      quote -= amountOut;
      return { ok: true, amountOut, feeAmount: fee };
    },
    burnFromPool: (baseAmount) => {
      base -= baseAmount;
    },
    withdrawFees: () => 0n,
  };
}

/** Builds and runs a small mixed-actor scenario for a given seed. */
function runScenario(seed: number): EngineResult {
  const duration = 20_000;
  const rng = createRng(seed);
  const retail = createRetailActors(
    {
      spendMin: 100_000_000n,
      spendMax: 1_000_000_000n,
      overSlots: 15_000,
      takeProfitX: 2,
      stopLossMultiplier: 0.5,
      sellProbabilityBps: 5_000n,
    },
    20,
    duration,
    500,
    rng.fork("retail"),
  );
  const snipers = createSniperActors(
    {
      spendMin: 1_000_000_000n,
      spendMax: 3_000_000_000n,
      at: 0,
      priorityFee: 10_000n,
      holdSlots: 150,
      sellAtX: 2,
    },
    5,
    duration,
    rng.fork("sniper"),
  );
  const whaleScheduled = createWhaleActor(
    "whale-0",
    { spend: 50_000_000_000n, at: 4_500, sellAtX: 3 },
    duration,
    500,
  );

  const initialWallets = new Map<string, ReturnType<typeof createWallet>>();
  for (const { actor } of [...retail, ...snipers, { actor: whaleScheduled.actor }]) {
    initialWallets.set(actor.id, createWallet(5_000_000_000n));
  }

  return runEngine({
    market: createFakeMarket(30_000_000_000n, 1_073_000_000_000_000n),
    mechanics: [],
    scheduledActors: [...retail, ...snipers, whaleScheduled],
    initialWallets,
    duration,
    sampleEvery: 500,
    clock: createClock(400),
    rng,
  });
}

describe("determinism (docs/07)", () => {
  it("running the same scenario twice with the same seed gives byte-identical results", () => {
    const first = runScenario(42);
    const second = runScenario(42);
    expect(JSON.stringify(first, (_key, value) => (typeof value === "bigint" ? value.toString() : value))).toBe(
      JSON.stringify(second, (_key, value) => (typeof value === "bigint" ? value.toString() : value)),
    );
  });

  it("changing only the seed changes the result (proves the Rng is wired in)", () => {
    const seed42 = runScenario(42);
    const seed43 = runScenario(43);
    expect(seed42.trades).not.toEqual(seed43.trades);
  });
});
