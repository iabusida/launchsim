import { describe, it, expect } from "vitest";
import { ScenarioConfigSchema } from "./scenario-config.schema.js";

const fullConfig = {
  schemaVersion: 1,
  name: "hourly burn from LP",
  seed: 42,
  duration: "48h",
  sampleEvery: "1m",
  slotMs: 400,
  token: { symbol: "TEST", decimals: 6, supply: "1000000000" },
  market: {
    kind: "pump-curve",
    virtualQuote: "30 SOL",
    virtualBase: "1073000000000000",
    feeBps: "1%",
    graduationQuote: "85 SOL",
  },
  mechanics: [{ kind: "lpBurn", perHour: ["5%", "4%", "3%", "1%"], stepEvery: "24h" }],
  actors: [
    { group: "sniper", count: 5, spend: "2 SOL", at: "slot:0", holdSlots: 150, sellAtX: 2 },
    {
      group: "retail",
      count: 300,
      spend: "0.1-1 SOL",
      over: "6h",
      takeProfitX: 2,
      stopLossPct: "50%",
      sellProbabilityBps: 3000,
    },
  ],
  checks: [
    { kind: "quoteNeverBelowPctOfPeak", bps: 5000 },
    { kind: "groupSupplyShareBelow", group: "sniper", at: "1m", bps: 1000 },
  ],
};

describe("ScenarioConfigSchema", () => {
  it("accepts a full, realistic scenario", () => {
    const result = ScenarioConfigSchema.safeParse(fullConfig);
    expect(result.success).toBe(true);
  });

  it("applies documented top-level defaults for a minimal scenario", () => {
    const result = ScenarioConfigSchema.parse({
      schemaVersion: 1,
      name: "baseline",
      duration: "48h",
      token: { supply: "1000000000" },
      market: { kind: "cpmm", quote: "30 SOL", base: "1000000000", feeBps: "1%" },
    });
    expect(result.seed).toBe(42);
    expect(result.sampleEvery).toBe("1m");
    expect(result.slotMs).toBe(400);
    expect(result.token).toEqual({ symbol: "TEST", decimals: 6, supply: "1000000000" });
    expect(result.mechanics).toEqual([]);
    expect(result.actors).toEqual([]);
    expect(result.checks).toEqual([]);
  });

  it("rejects schemaVersion values other than 1", () => {
    const result = ScenarioConfigSchema.safeParse({ ...fullConfig, schemaVersion: 2 });
    expect(result.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const result = ScenarioConfigSchema.safeParse({ ...fullConfig, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a name longer than 120 characters", () => {
    const result = ScenarioConfigSchema.safeParse({ ...fullConfig, name: "x".repeat(121) });
    expect(result.success).toBe(false);
  });

  it("rejects a negative seed", () => {
    const result = ScenarioConfigSchema.safeParse({ ...fullConfig, seed: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects a seed above the uint32 range", () => {
    const result = ScenarioConfigSchema.safeParse({ ...fullConfig, seed: 2 ** 32 });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive slotMs", () => {
    const result = ScenarioConfigSchema.safeParse({ ...fullConfig, slotMs: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown top-level key (zod .strict())", () => {
    const result = ScenarioConfigSchema.safeParse({ ...fullConfig, typo: true });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed market config nested inside a valid scenario", () => {
    const result = ScenarioConfigSchema.safeParse({ ...fullConfig, market: { kind: "orderbook" } });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed actor config nested inside a valid scenario", () => {
    const result = ScenarioConfigSchema.safeParse({
      ...fullConfig,
      actors: [{ group: "notAGroup" }],
    });
    expect(result.success).toBe(false);
  });
});
