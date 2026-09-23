import { describe, it, expect } from "vitest";
import { createRng } from "@launchsim/core";
import { buildActors } from "./build-actors.js";

const SLOT_MS = 400;
const DURATION = 100_000;
const SAMPLE_EVERY = 9_000;

describe("buildActors", () => {
  it("builds retail actors with wallets funded at the spend range's max", () => {
    const { scheduledActors, initialWallets } = buildActors(
      [{ group: "retail", count: 3, spend: "0.1-1 MON", over: "6h", takeProfitX: 2, stopLossPct: "50%", sellProbabilityBps: 3000 }],
      DURATION,
      SAMPLE_EVERY,
      SLOT_MS,
      createRng(42),
    );
    expect(scheduledActors).toHaveLength(3);
    expect(scheduledActors.every((s) => s.actor.group === "retail")).toBe(true);
    for (const { actor } of scheduledActors) {
      expect(initialWallets.get(actor.id)).toEqual({
        quoteBalance: 1_000_000_000_000_000_000n,
        baseBalance: 0n,
        entryPrice: null,
      });
    }
  });

  it("builds sniper actors, defaulting priorityFee to 0 when omitted", () => {
    const { scheduledActors } = buildActors(
      [{ group: "sniper", count: 2, spend: "2 MON", at: "slot:0", holdSlots: 150, sellAtX: 2 }],
      DURATION,
      SAMPLE_EVERY,
      SLOT_MS,
      createRng(42),
    );
    expect(scheduledActors).toHaveLength(2);
    expect(scheduledActors.every((s) => s.actor.group === "sniper")).toBe(true);
  });

  it("builds sniper actors with an explicit priorityFee", () => {
    const { scheduledActors } = buildActors(
      [
        {
          group: "sniper",
          count: 1,
          spend: "2 MON",
          at: "slot:0",
          priorityFee: "0.01 MON",
          holdSlots: 150,
          sellAtX: 2,
        },
      ],
      DURATION,
      SAMPLE_EVERY,
      SLOT_MS,
      createRng(42),
    );
    expect(scheduledActors).toHaveLength(1);
  });

  it("builds exactly one whale actor per config entry (no count field)", () => {
    const { scheduledActors, initialWallets } = buildActors(
      [{ group: "whale", spend: "50 MON", at: "30m", sellAtX: 3 }],
      DURATION,
      SAMPLE_EVERY,
      SLOT_MS,
      createRng(42),
    );
    expect(scheduledActors).toHaveLength(1);
    const [whale] = scheduledActors;
    expect(whale?.actor.group).toBe("whale");
    expect(initialWallets.get(whale?.actor.id ?? "")?.quoteBalance).toBe(50_000_000_000_000_000_000n);
  });

  it("builds panicSeller actors, already funded with holdings, not quote", () => {
    const { scheduledActors, initialWallets } = buildActors(
      [{ group: "panicSeller", count: 4, holdings: "100-200", triggerDrawdown: "30%" }],
      DURATION,
      SAMPLE_EVERY,
      SLOT_MS,
      createRng(42),
    );
    expect(scheduledActors).toHaveLength(4);
    for (const { actor } of scheduledActors) {
      const wallet = initialWallets.get(actor.id);
      expect(wallet?.quoteBalance).toBe(0n);
      expect(wallet?.baseBalance).toBeGreaterThanOrEqual(100n);
    }
  });

  it("combines multiple actor config entries into one result", () => {
    const { scheduledActors } = buildActors(
      [
        { group: "retail", count: 2, spend: "1 MON", over: "6h", takeProfitX: 2, stopLossPct: "50%", sellProbabilityBps: 3000 },
        { group: "sniper", count: 1, spend: "2 MON", at: "slot:0", holdSlots: 150, sellAtX: 2 },
      ],
      DURATION,
      SAMPLE_EVERY,
      SLOT_MS,
      createRng(42),
    );
    expect(scheduledActors).toHaveLength(3);
  });

  it("throws a clear error for an actor group not yet implemented", () => {
    expect(() =>
      buildActors(
        [{ group: "bundler", wallets: 10, totalSpend: "5 MON", trancheBps: 2000, sellEvery: "10m" }],
        DURATION,
        SAMPLE_EVERY,
        SLOT_MS,
        createRng(42),
      ),
    ).toThrow(/bundler.*not yet implemented/);
  });
});
