import { describe, it, expect } from "vitest";
import { MarketConfigSchema } from "./market-config.schema.js";

describe("MarketConfigSchema", () => {
  it("accepts a pump-curve config", () => {
    const result = MarketConfigSchema.safeParse({
      kind: "pump-curve",
      virtualQuote: "30 SOL",
      virtualBase: "1073000000000000",
      feeBps: "1%",
      graduationQuote: "85 SOL",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a nadfun-curve config", () => {
    const result = MarketConfigSchema.safeParse({
      kind: "nadfun-curve",
      virtualQuote: "180000 MON",
      virtualBase: "1073000000000000",
      feeBps: "1%",
      graduationQuote: "225000 MON",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed virtualQuote amount on nadfun-curve", () => {
    const result = MarketConfigSchema.safeParse({
      kind: "nadfun-curve",
      virtualQuote: "180000",
      virtualBase: "1073000000000000",
      feeBps: "1%",
      graduationQuote: "225000 MON",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a cpmm config", () => {
    const result = MarketConfigSchema.safeParse({
      kind: "cpmm",
      quote: "100 SOL",
      base: "1000000000000",
      feeBps: "0.3%",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown kind", () => {
    const result = MarketConfigSchema.safeParse({ kind: "orderbook" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown key (zod .strict())", () => {
    const result = MarketConfigSchema.safeParse({
      kind: "cpmm",
      quote: "100 SOL",
      base: "1000000000000",
      feeBps: "0.3%",
      typo: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a base supply that is not a plain decimal string", () => {
    const result = MarketConfigSchema.safeParse({
      kind: "cpmm",
      quote: "100 SOL",
      base: "1_000_000",
      feeBps: "0.3%",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed virtualQuote amount on pump-curve", () => {
    const result = MarketConfigSchema.safeParse({
      kind: "pump-curve",
      virtualQuote: "30",
      virtualBase: "1073000000000000",
      feeBps: "1%",
      graduationQuote: "85 SOL",
    });
    expect(result.success).toBe(false);
  });
});
