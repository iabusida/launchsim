import { describe, it, expect } from "vitest";
import { createMaxDrawdownBelowCheck } from "./max-drawdown-below.js";
import type { Ledger, TimelineSample } from "../types.js";

function ledgerWithSamples(samples: readonly TimelineSample[]): Ledger {
  return {
    timeline: { samples, peakQuoteReserve: 0n },
    trades: [],
    mechanicEvents: [],
    wallets: new Map(),
  };
}

function sample(slot: number, quoteReserve: bigint, baseReserve = 1_000_000n): TimelineSample {
  return { slot, quoteReserve, baseReserve };
}

describe("createMaxDrawdownBelowCheck", () => {
  it("passes when no window's price drop reaches the threshold", () => {
    const check = createMaxDrawdownBelowCheck(8_000n, 100); // 80%, 100-slot window
    const ledger = ledgerWithSamples([sample(0, 1_000n), sample(50, 900n), sample(100, 850n)]);
    // worst drop: 1000 -> 850 = 15% < 80%
    const result = check.evaluate(ledger);
    expect(result.passed).toBe(true);
    expect(result.id).toBe("maxDrawdownBelow");
    expect(result.observed).toBe("1500");
    expect(result.summary).toBe("max 100-slot drawdown was 15%, below the 80% limit");
  });

  it("fails when some window's price drop reaches the threshold", () => {
    const check = createMaxDrawdownBelowCheck(5_000n, 100); // 50%, 100-slot window
    const ledger = ledgerWithSamples([sample(0, 1_000n), sample(50, 400n)]); // -60% within 100 slots
    const result = check.evaluate(ledger);
    expect(result.passed).toBe(false);
    expect(result.atSlot).toBe(50);
    expect(result.id).toBe("maxDrawdownBelow");
    expect(result.observed).toBe("6000");
    expect(result.summary).toBe("max 100-slot drawdown reached 60% at slot 50");
  });

  it("fails when the drawdown exactly equals the threshold (below is strict)", () => {
    const check = createMaxDrawdownBelowCheck(5_000n, 100); // exactly 50%
    const ledger = ledgerWithSamples([sample(0, 1_000n), sample(10, 500n)]); // exactly -50%
    expect(check.evaluate(ledger).passed).toBe(false);
  });

  it("keeps the worst drop, not the last one, when a smaller drop follows it", () => {
    const check = createMaxDrawdownBelowCheck(2_000n, 1_000); // 20%
    const ledger = ledgerWithSamples([
      sample(0, 1_000n),
      sample(10, 100n), // -90% from the first peak
      sample(20, 2_000n), // a new, higher peak
      sample(30, 1_900n), // only -5% from the second peak
    ]);
    const result = check.evaluate(ledger);
    // The 90% drop must still be reported even though a smaller 5% drop is
    // found later; a 90% drawdown also fails the 20% threshold.
    expect(result.passed).toBe(false);
    expect(result.atSlot).toBe(10);
  });

  it("keeps the earliest trough when two drops tie exactly", () => {
    const check = createMaxDrawdownBelowCheck(1_000n, 1_000); // 10%, deliberately failing
    const ledger = ledgerWithSamples([
      sample(0, 1_000n),
      sample(10, 500n), // exactly -50% from the first peak
      sample(20, 2_000n), // a new, higher peak
      sample(30, 1_000n), // exactly -50% from the second peak, same magnitude
    ]);
    // A later drop of equal (not greater) magnitude must not overwrite the
    // first one found.
    expect(check.evaluate(ledger).atSlot).toBe(10);
  });

  it("only looks forward for troughs, never at samples before the peak", () => {
    const check = createMaxDrawdownBelowCheck(5_000n, 100); // 50%
    const ledger = ledgerWithSamples([
      sample(0, 100n), // a low value before the real peak; must never be
      // treated as a trough for a later peak
      sample(10, 1_000n),
      sample(20, 999n), // a genuine, tiny drop from the real peak (0.1%)
    ]);
    // The only real drawdown here is ~0.1%, well below the 50% threshold.
    expect(check.evaluate(ledger).passed).toBe(true);
  });

  it("does not divide by zero when a trough sample is fully drained", () => {
    const check = createMaxDrawdownBelowCheck(5_000n, 100);
    const ledger = ledgerWithSamples([
      sample(0, 1_000n),
      sample(10, 0n, 0n), // both reserves zero: not a valid "drop" candidate
    ]);
    expect(check.evaluate(ledger).passed).toBe(true);
  });

  it("ignores a drop that only completes outside the window", () => {
    const check = createMaxDrawdownBelowCheck(5_000n, 40); // 50%, 40-slot window
    const ledger = ledgerWithSamples([sample(0, 1_000n), sample(50, 400n)]); // 50 slots > 40-slot window
    expect(check.evaluate(ledger).passed).toBe(true);
  });

  it("only counts a drawdown from an earlier peak, not a rise", () => {
    const check = createMaxDrawdownBelowCheck(5_000n, 100);
    const ledger = ledgerWithSamples([sample(0, 400n), sample(50, 1_000n)]); // a rise, not a drop
    expect(check.evaluate(ledger).passed).toBe(true);
  });

  it("skips a zero-reserve sample as a peak candidate (nothing to drop from)", () => {
    const check = createMaxDrawdownBelowCheck(5_000n, 100);
    const ledger = ledgerWithSamples([sample(0, 0n), sample(50, 1_000n)]);
    expect(check.evaluate(ledger).passed).toBe(true);
  });

  it("does not divide by zero when a zero-reserve peak is skipped against a negative trough", () => {
    const check = createMaxDrawdownBelowCheck(5_000n, 100);
    // A zero-reserve sample must be skipped as a peak candidate outright.
    // If it were not, this negative-reserve trough would make the trough
    // side of the cross-multiplication exactly zero and divide by it.
    const ledger = ledgerWithSamples([sample(0, 0n), sample(10, -100n)]);
    expect(check.evaluate(ledger).passed).toBe(true);
  });

  it("includes a trough landing on exactly the window boundary", () => {
    const check = createMaxDrawdownBelowCheck(5_000n, 40); // 50%, 40-slot window
    const ledger = ledgerWithSamples([sample(100, 1_000n), sample(140, 400n)]); // exactly 40 slots later, -60%
    const result = check.evaluate(ledger);
    // The window comparison is `slot - slot > window`, not a sum and not
    // `>=`: a trough exactly `window` slots after the peak still counts.
    expect(result.passed).toBe(false);
    expect(result.atSlot).toBe(140);
  });

  it("passes trivially on fewer than two samples", () => {
    const check = createMaxDrawdownBelowCheck(5_000n, 100);
    expect(check.evaluate(ledgerWithSamples([sample(0, 1_000n)])).passed).toBe(true);
    expect(check.evaluate(ledgerWithSamples([])).passed).toBe(true);
  });

  it("reports its id and kind", () => {
    const check = createMaxDrawdownBelowCheck(5_000n, 100);
    expect(check.id).toBe("maxDrawdownBelow");
    expect(check.evaluate(ledgerWithSamples([])).kind).toBe("maxDrawdownBelow");
  });
});
