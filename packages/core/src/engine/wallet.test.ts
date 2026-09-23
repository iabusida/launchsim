import { describe, it, expect } from "vitest";
import { createWallet, applyFill } from "./wallet.js";

describe("createWallet", () => {
  it("starts with the given quote balance and zero base", () => {
    expect(createWallet(1_000_000n)).toEqual({
      quoteBalance: 1_000_000n,
      baseBalance: 0n,
      entryPrice: null,
    });
  });

  it("throws when the starting quote balance is negative", () => {
    expect(() => createWallet(-1n)).toThrow(/non-negative/);
  });
});

describe("applyFill", () => {
  it("applies a buy fill: quote decreases, base increases", () => {
    const wallet = createWallet(1_000_000n);
    const next = applyFill(wallet, { side: "buy", quoteAmount: 10_000n, baseAmount: 9_802n });
    expect(next.quoteBalance).toBe(990_000n);
    expect(next.baseBalance).toBe(9_802n);
  });

  it("sets entryPrice on the first buy", () => {
    const wallet = createWallet(1_000_000n);
    const next = applyFill(wallet, { side: "buy", quoteAmount: 10_000n, baseAmount: 9_802n });
    expect(next.entryPrice).toEqual({ num: 10_000n, den: 9_802n });
  });

  it("keeps the original entryPrice on a second buy (first entry, not average)", () => {
    const wallet = createWallet(1_000_000n);
    const afterFirst = applyFill(wallet, { side: "buy", quoteAmount: 10_000n, baseAmount: 9_802n });
    const afterSecond = applyFill(afterFirst, { side: "buy", quoteAmount: 5_000n, baseAmount: 4_829n });
    expect(afterSecond.entryPrice).toEqual({ num: 10_000n, den: 9_802n });
  });

  it("applies a sell fill: base decreases, quote increases", () => {
    const wallet = createWallet(10_000n);
    const holding = applyFill(wallet, { side: "buy", quoteAmount: 10_000n, baseAmount: 9_802n });
    const next = applyFill(holding, { side: "sell", quoteAmount: 5_024n, baseAmount: 5_000n });
    expect(next.quoteBalance).toBe(5_024n);
    expect(next.baseBalance).toBe(4_802n);
  });

  it("clears entryPrice once the full base balance is sold", () => {
    const wallet = createWallet(10_000n);
    const holding = applyFill(wallet, { side: "buy", quoteAmount: 10_000n, baseAmount: 9_802n });
    const sold = applyFill(holding, { side: "sell", quoteAmount: 10_000n, baseAmount: 9_802n });
    expect(sold.baseBalance).toBe(0n);
    expect(sold.entryPrice).toBeNull();
  });

  it("applies a zero-amount buy fill without setting an entry price or throwing", () => {
    const wallet = createWallet(0n);
    const next = applyFill(wallet, { side: "buy", quoteAmount: 0n, baseAmount: 0n });
    expect(next).toEqual({ quoteBalance: 0n, baseBalance: 0n, entryPrice: null });
  });

  it("throws on a buy that exceeds the quote balance", () => {
    const wallet = createWallet(100n);
    expect(() => applyFill(wallet, { side: "buy", quoteAmount: 101n, baseAmount: 1n })).toThrow(
      /insufficient/,
    );
  });

  it("throws on a sell that exceeds the base balance", () => {
    const wallet = createWallet(0n);
    expect(() => applyFill(wallet, { side: "sell", quoteAmount: 1n, baseAmount: 1n })).toThrow(
      /insufficient/,
    );
  });
});
