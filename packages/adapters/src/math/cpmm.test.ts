import { describe, it, expect } from "vitest";
import { createCpmm, cpmmQuoteBuy, cpmmQuoteSell } from "./cpmm.js";

describe("createCpmm", () => {
  it("builds a pool from initial reserves and a fee", () => {
    expect(createCpmm(100_000_000_000n, 1_000_000_000_000n, 100n)).toEqual({
      quoteReserve: 100_000_000_000n,
      baseReserve: 1_000_000_000_000n,
      feeBps: 100n,
      quoteFeesCollected: 0n,
    });
  });

  it("throws when the quote reserve is not positive", () => {
    expect(() => createCpmm(0n, 1_000n, 100n)).toThrow(/positive/);
  });

  it("throws when the base reserve is not positive", () => {
    expect(() => createCpmm(1_000n, 0n, 100n)).toThrow(/positive/);
  });

  it("throws when feeBps is negative", () => {
    expect(() => createCpmm(1_000n, 1_000n, -1n)).toThrow(/non-negative/);
  });
});

describe("cpmmQuoteBuy", () => {
  it("quotes base out for a quote-in amount, net of fee", () => {
    // pool: 100 quote / 100 base, 1% fee, buy with 10 quote
    const pool = createCpmm(100n, 100n, 100n);
    // fee = floor(10 * 100 / 10_000) = 0 (too small to register at this scale)
    const quote = cpmmQuoteBuy(pool, 10n);
    expect(quote.feeAmount).toBe(0n);
    // amountOut = floor(10 * 100 / (100 + 10)) = floor(1000/110) = 9
    expect(quote.amountOut).toBe(9n);
  });

  it("takes a non-zero fee at a larger scale", () => {
    const pool = createCpmm(1_000_000n, 1_000_000n, 100n); // 1% fee
    const quote = cpmmQuoteBuy(pool, 10_000n);
    expect(quote.feeAmount).toBe(100n); // 1% of 10_000
  });

  it("does not mutate the pool", () => {
    const pool = createCpmm(1_000_000n, 1_000_000n, 100n);
    cpmmQuoteBuy(pool, 10_000n);
    expect(pool).toEqual(createCpmm(1_000_000n, 1_000_000n, 100n));
  });

  it("returns a trivial zero quote for a zero quoteIn", () => {
    const pool = createCpmm(1_000n, 1_000n, 100n);
    expect(cpmmQuoteBuy(pool, 0n)).toEqual({ amountOut: 0n, feeAmount: 0n });
  });

  it("throws when quoteIn is negative", () => {
    const pool = createCpmm(1_000n, 1_000n, 100n);
    expect(() => cpmmQuoteBuy(pool, -1n)).toThrow(/non-negative/);
  });
});

describe("cpmmQuoteSell", () => {
  it("quotes quote out for a base-in amount, net of fee", () => {
    const pool = createCpmm(1_000_000n, 1_000_000n, 100n);
    const quote = cpmmQuoteSell(pool, 10_000n);
    // rawQuoteOut = floor(10_000 * 1_000_000 / (1_000_000 + 10_000)) = floor(9900.99...) = 9900
    // fee = floor(9900 * 100 / 10_000) = 99
    expect(quote.feeAmount).toBe(99n);
    expect(quote.amountOut).toBe(9_801n); // 9900 - 99
  });

  it("returns a trivial zero quote for a zero baseIn", () => {
    const pool = createCpmm(1_000n, 1_000n, 100n);
    expect(cpmmQuoteSell(pool, 0n)).toEqual({ amountOut: 0n, feeAmount: 0n });
  });

  it("throws when baseIn is negative", () => {
    const pool = createCpmm(1_000n, 1_000n, 100n);
    expect(() => cpmmQuoteSell(pool, -1n)).toThrow(/non-negative/);
  });
});
