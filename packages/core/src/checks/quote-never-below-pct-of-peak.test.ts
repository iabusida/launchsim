import { describe, it, expect } from "vitest";
import { createQuoteNeverBelowPctOfPeakCheck } from "./quote-never-below-pct-of-peak.js";
import type { Ledger } from "../types.js";

function ledgerWithSamples(quoteReserves: readonly bigint[]): Ledger {
  return {
    timeline: {
      samples: quoteReserves.map((quoteReserve, i) => ({
        slot: i * 100,
        quoteReserve,
        baseReserve: 1_000_000n,
      })),
      peakQuoteReserve: quoteReserves.reduce((a, b) => (a > b ? a : b), 0n),
    },
    trades: [],
    mechanicEvents: [],
    wallets: new Map(),
  };
}

describe("createQuoteNeverBelowPctOfPeak", () => {
  it("passes when the quote reserve never drops below the threshold of its running peak", () => {
    const check = createQuoteNeverBelowPctOfPeakCheck(5_000n); // 50%
    const ledger = ledgerWithSamples([1_000n, 1_200n, 1_100n, 900n]); // 900/1200 = 75% >= 50%
    const result = check.evaluate(ledger);
    expect(result.passed).toBe(true);
    expect(result.atSlot).toBeNull();
    expect(result.id).toBe("quoteNeverBelowPctOfPeak");
    expect(result.summary).toBe("pool quote never fell below 50% of its running peak");
  });

  it("passes exactly at the threshold (never *below* is not violated by *at*)", () => {
    const check = createQuoteNeverBelowPctOfPeakCheck(5_000n); // 50%
    const ledger = ledgerWithSamples([1_000n, 500n]); // exactly 50% of peak
    expect(check.evaluate(ledger).passed).toBe(true);
  });

  it("fails at the first slot the reserve drops below the threshold of its running peak", () => {
    const check = createQuoteNeverBelowPctOfPeakCheck(5_000n); // 50%
    const ledger = ledgerWithSamples([1_000n, 1_000n, 400n]); // 400/1000 = 40% < 50%
    const result = check.evaluate(ledger);
    expect(result.passed).toBe(false);
    expect(result.atSlot).toBe(200);
    expect(result.id).toBe("quoteNeverBelowPctOfPeak");
    expect(result.kind).toBe("quoteNeverBelowPctOfPeak");
    expect(result.observed).toBe("4000");
    expect(result.summary).toBe("pool quote fell to 40% of peak at slot 200");
  });

  it("does not flag a negative reserve before any positive peak has been observed", () => {
    const check = createQuoteNeverBelowPctOfPeakCheck(5_000n);
    // The running peak starts at 0n; a negative sample must not be
    // compared against it as if 0n were a real, positive peak.
    const ledger = ledgerWithSamples([-100n]);
    expect(check.evaluate(ledger).passed).toBe(true);
  });

  it("passes trivially on an empty timeline", () => {
    const check = createQuoteNeverBelowPctOfPeakCheck(5_000n);
    const result = check.evaluate(ledgerWithSamples([]));
    expect(result.passed).toBe(true);
  });

  it("reports its id and kind", () => {
    const check = createQuoteNeverBelowPctOfPeakCheck(5_000n);
    expect(check.id).toBe("quoteNeverBelowPctOfPeak");
    const result = check.evaluate(ledgerWithSamples([1_000n]));
    expect(result.kind).toBe("quoteNeverBelowPctOfPeak");
  });
});
