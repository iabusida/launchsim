import { describe, it, expect } from "vitest";
import { buildMarket } from "./build-market.js";

describe("buildMarket", () => {
  it("builds a pump-curve market from config", () => {
    const { market, quoteUnit } = buildMarket({
      kind: "pump-curve",
      virtualQuote: "180000 MON",
      virtualBase: "1073000000000000",
      feeBps: "1%",
      graduationQuote: "225000 MON",
    });
    expect(market.kind).toBe("math/pump-curve");
    expect(market.state()).toEqual({
      quoteReserve: 180_000_000_000_000_000_000_000n,
      baseReserve: 1_073_000_000_000_000n,
      quoteFeesCollected: 0n,
    });
    expect(quoteUnit).toEqual({ symbol: "MON", decimals: 18 });
  });

  it("builds a nadfun-curve market from config", () => {
    const { market, quoteUnit } = buildMarket({
      kind: "nadfun-curve",
      virtualQuote: "180000 MON",
      virtualBase: "1073000000000000",
      feeBps: "1%",
      graduationQuote: "225000 MON",
    });
    expect(market.kind).toBe("math/nadfun-curve");
    expect(market.state()).toEqual({
      quoteReserve: 180_000_000_000_000_000_000_000n,
      baseReserve: 1_073_000_000_000_000n,
      quoteFeesCollected: 0n,
    });
    expect(quoteUnit).toEqual({ symbol: "MON", decimals: 18 });
  });

  it("builds a cpmm market from config", () => {
    const { market, quoteUnit } = buildMarket({
      kind: "cpmm",
      quote: "30000 MON",
      base: "1073000000000000",
      feeBps: "1%",
    });
    expect(market.kind).toBe("math/cpmm");
    expect(market.state()).toEqual({
      quoteReserve: 30_000_000_000_000_000_000_000n,
      baseReserve: 1_073_000_000_000_000n,
      quoteFeesCollected: 0n,
    });
    expect(quoteUnit).toEqual({ symbol: "MON", decimals: 18 });
  });

  it("supports a SOL-denominated market (deferred Solana path)", () => {
    const { quoteUnit } = buildMarket({
      kind: "cpmm",
      quote: "30 SOL",
      base: "1000000",
      feeBps: "1%",
    });
    expect(quoteUnit).toEqual({ symbol: "SOL", decimals: 9 });
  });
});
