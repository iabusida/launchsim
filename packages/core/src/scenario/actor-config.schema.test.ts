import { describe, it, expect } from "vitest";
import { ActorConfigSchema } from "./actor-config.schema.js";

describe("ActorConfigSchema", () => {
  it("accepts a retail actor with explicit params", () => {
    const result = ActorConfigSchema.safeParse({
      group: "retail",
      count: 300,
      spend: "0.1-1 SOL",
      over: "6h",
      takeProfitX: 2,
      stopLossPct: "50%",
      sellProbabilityBps: 3000,
    });
    expect(result.success).toBe(true);
  });

  it("defaults a retail actor's optional params", () => {
    const result = ActorConfigSchema.parse({
      group: "retail",
      count: 300,
      spend: "1 SOL",
      over: "6h",
    });
    expect(result).toEqual({
      group: "retail",
      count: 300,
      spend: "1 SOL",
      over: "6h",
      takeProfitX: 2,
      stopLossPct: "50%",
      sellProbabilityBps: 3000,
    });
  });

  it("accepts a sniper actor and defaults slot:0", () => {
    const result = ActorConfigSchema.parse({ group: "sniper", count: 5, spend: "2 SOL" });
    if (result.group !== "sniper") {
      throw new Error("expected a sniper actor");
    }
    expect(result.at).toBe("slot:0");
    expect(result.holdSlots).toBe(150);
    expect(result.sellAtX).toBe(2);
  });

  it("accepts a bundler actor with defaults", () => {
    const result = ActorConfigSchema.parse({ group: "bundler", totalSpend: "10 SOL" });
    expect(result).toEqual({
      group: "bundler",
      wallets: 10,
      totalSpend: "10 SOL",
      trancheBps: 2000,
      sellEvery: "10m",
    });
  });

  it("accepts a whale actor with defaults", () => {
    const result = ActorConfigSchema.parse({ group: "whale", spend: "50 SOL" });
    expect(result).toEqual({ group: "whale", spend: "50 SOL", at: "30m", sellAtX: 3 });
  });

  it("accepts a panicSeller actor with defaults", () => {
    const result = ActorConfigSchema.parse({
      group: "panicSeller",
      count: 40,
      holdings: "100000-1000000",
    });
    expect(result).toEqual({
      group: "panicSeller",
      count: 40,
      holdings: "100000-1000000",
      triggerDrawdown: "30%",
    });
  });

  it("accepts a flipper actor with defaults", () => {
    const result = ActorConfigSchema.parse({ group: "flipper", count: 10, spend: "0.1-0.5 SOL" });
    expect(result).toEqual({
      group: "flipper",
      count: 10,
      spend: "0.1-0.5 SOL",
      cycleEvery: "5m",
      momentumWindow: 3,
    });
  });

  it("rejects an unknown group", () => {
    const result = ActorConfigSchema.safeParse({ group: "notAGroup" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown key (zod .strict())", () => {
    const result = ActorConfigSchema.safeParse({
      group: "whale",
      spend: "50 SOL",
      typo: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive count", () => {
    const result = ActorConfigSchema.safeParse({
      group: "retail",
      count: 0,
      spend: "1 SOL",
      over: "6h",
    });
    expect(result.success).toBe(false);
  });
});
