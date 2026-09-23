import { describe, it, expect } from "vitest";
import { runEngine } from "./engine.js";
import { createClock } from "./clock.js";
import { createRng } from "./rng.js";
import { createWallet } from "./wallet.js";
import { createRetailActors } from "../actors/retail.js";
import type { Market } from "../types.js";

describe("runEngine (perf sanity check)", () => {
  it("runs a 48h/400ms-slot scenario with 300 monitored actors well under a second", () => {
    // Regression guard: an earlier O(n)-per-operation EventQueue made this
    // take ~20s (300 retail actors x ~48 monitoring check-ins each,
    // scattered across a 432,000-slot timeline). The heap-based queue
    // (see event-queue.ts) brought it back down to milliseconds.
    const market: Market = {
      kind: "math/cpmm",
      state: () => ({ quoteReserve: 1_000_000n, baseReserve: 1_000_000n, quoteFeesCollected: 0n }),
      quoteBuy: () => ({ amountOut: 0n, feeAmount: 0n }),
      quoteSell: () => ({ amountOut: 0n, feeAmount: 0n }),
      buy: () => ({ ok: true, amountOut: 0n, feeAmount: 0n }),
      sell: () => ({ ok: true, amountOut: 0n, feeAmount: 0n }),
      burnFromPool: () => undefined,
      withdrawFees: () => 0n,
    };
    const rng = createRng(42);
    const retail = createRetailActors(
      {
        spendMin: 100_000_000n,
        spendMax: 1_000_000_000n,
        overSlots: 54_000,
        takeProfitX: 2,
        stopLossMultiplier: 0.5,
        sellProbabilityBps: 3_000n,
      },
      300,
      432_000,
      9_000,
      rng,
    );
    const initialWallets = new Map(retail.map(({ actor }) => [actor.id, createWallet(5_000_000_000n)]));

    const start = performance.now();
    const result = runEngine({
      market,
      mechanics: [],
      scheduledActors: retail,
      initialWallets,
      duration: 432_000,
      sampleEvery: 150,
      clock: createClock(400),
      rng,
    });
    const elapsedMs = performance.now() - start;
    // Generous: normal runs finish in ~150-300ms, but Stryker's mutation
    // instrumentation adds real per-statement overhead (~7-8s observed).
    // The regression this guards against was ~20-25s -- still two orders
    // of magnitude past this threshold even under instrumentation.
    expect(elapsedMs).toBeLessThan(15_000);
    expect(result.trades.length).toBeGreaterThan(0);
  });

  it("runs a 48h/400ms-slot scenario with no actors well under a second (docs/01)", () => {
    const market: Market = {
      kind: "math/cpmm",
      state: () => ({ quoteReserve: 1_000_000n, baseReserve: 1_000_000n, quoteFeesCollected: 0n }),
      quoteBuy: () => ({ amountOut: 0n, feeAmount: 0n }),
      quoteSell: () => ({ amountOut: 0n, feeAmount: 0n }),
      buy: () => ({ ok: false, reason: "n/a" }),
      sell: () => ({ ok: false, reason: "n/a" }),
      burnFromPool: () => undefined,
      withdrawFees: () => 0n,
    };
    const start = performance.now();
    const result = runEngine({
      market,
      mechanics: [],
      scheduledActors: [],
      initialWallets: new Map(),
      duration: 432_000, // 48h at 400ms/slot
      sampleEvery: 150, // ~1 minute
      clock: createClock(400),
      rng: createRng(42),
    });
    const elapsedMs = performance.now() - start;
    expect(elapsedMs).toBeLessThan(1000);
    expect(result.timeline.samples.length).toBeGreaterThan(0);
  });
});
