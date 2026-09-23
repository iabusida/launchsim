import { describe, it, expect } from "vitest";
import { MechanicConfigSchema } from "./mechanic-config.schema.js";

describe("MechanicConfigSchema", () => {
  it("accepts an lpBurn config", () => {
    const result = MechanicConfigSchema.safeParse({
      kind: "lpBurn",
      perHour: ["5%", "4%", "3%", "1%"],
      stepEvery: "24h",
    });
    expect(result.success).toBe(true);
  });

  it("defaults lpBurn's stepEvery to 24h", () => {
    const result = MechanicConfigSchema.parse({ kind: "lpBurn", perHour: ["5%"] });
    expect(result).toEqual({ kind: "lpBurn", perHour: ["5%"], stepEvery: "24h" });
  });

  it("rejects an empty lpBurn schedule", () => {
    const result = MechanicConfigSchema.safeParse({ kind: "lpBurn", perHour: [] });
    expect(result.success).toBe(false);
  });

  it("accepts a feeBuyback config", () => {
    const result = MechanicConfigSchema.safeParse({
      kind: "feeBuyback",
      interval: "1h",
      feeShareBps: 10_000,
      minBuy: "0.01 SOL",
    });
    expect(result.success).toBe(true);
  });

  it("defaults feeBuyback's interval, feeShareBps, and minBuy", () => {
    const result = MechanicConfigSchema.parse({ kind: "feeBuyback" });
    expect(result).toEqual({
      kind: "feeBuyback",
      interval: "1h",
      feeShareBps: 10_000,
      minBuy: undefined,
    });
  });

  it("rejects a feeShareBps above 10_000", () => {
    const result = MechanicConfigSchema.safeParse({ kind: "feeBuyback", feeShareBps: 10_001 });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown kind", () => {
    const result = MechanicConfigSchema.safeParse({ kind: "rugPull" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown key (zod .strict())", () => {
    const result = MechanicConfigSchema.safeParse({ kind: "lpBurn", perHour: ["5%"], typo: true });
    expect(result.success).toBe(false);
  });
});
