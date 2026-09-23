import { describe, it, expect } from "vitest";
import { CheckConfigSchema } from "./check-config.schema.js";

describe("CheckConfigSchema", () => {
  it("accepts a quoteNeverBelowPctOfPeak check", () => {
    const result = CheckConfigSchema.safeParse({ kind: "quoteNeverBelowPctOfPeak", bps: 5000 });
    expect(result.success).toBe(true);
  });

  it("accepts a groupSupplyShareBelow check", () => {
    const result = CheckConfigSchema.safeParse({
      kind: "groupSupplyShareBelow",
      group: "sniper",
      at: "1m",
      bps: 1000,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a maxDrawdownBelow check", () => {
    const result = CheckConfigSchema.safeParse({
      kind: "maxDrawdownBelow",
      bps: 8000,
      window: "1h",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown kind", () => {
    const result = CheckConfigSchema.safeParse({ kind: "somethingElse", bps: 100 });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown key (zod .strict())", () => {
    const result = CheckConfigSchema.safeParse({
      kind: "quoteNeverBelowPctOfPeak",
      bps: 5000,
      typo: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative bps", () => {
    const result = CheckConfigSchema.safeParse({ kind: "quoteNeverBelowPctOfPeak", bps: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer bps", () => {
    const result = CheckConfigSchema.safeParse({ kind: "quoteNeverBelowPctOfPeak", bps: 1.5 });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown actor group in groupSupplyShareBelow", () => {
    const result = CheckConfigSchema.safeParse({
      kind: "groupSupplyShareBelow",
      group: "notAGroup",
      at: "1m",
      bps: 1000,
    });
    expect(result.success).toBe(false);
  });
});
