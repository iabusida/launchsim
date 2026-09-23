import { describe, it, expect } from "vitest";
import {
  AmountStringSchema,
  AmountRangeStringSchema,
  BaseUnitsStringSchema,
  BaseUnitsRangeStringSchema,
  PercentStringSchema,
  DurationStringSchema,
  SlotOrDurationStringSchema,
} from "./unit-strings.schema.js";

describe("AmountStringSchema", () => {
  it("accepts a whole MON amount", () => {
    expect(AmountStringSchema.safeParse("2 MON").success).toBe(true);
  });

  it("accepts a fractional MON amount", () => {
    expect(AmountStringSchema.safeParse("0.5 MON").success).toBe(true);
  });

  it("accepts a whole SOL amount (deferred Solana path)", () => {
    expect(AmountStringSchema.safeParse("2 SOL").success).toBe(true);
  });

  it("accepts a fractional SOL amount (deferred Solana path)", () => {
    expect(AmountStringSchema.safeParse("0.5 SOL").success).toBe(true);
  });

  it("accepts more than one space between the value and the unit", () => {
    expect(AmountStringSchema.safeParse("2  MON").success).toBe(true);
  });

  it("rejects a range", () => {
    expect(AmountStringSchema.safeParse("0.1-1 MON").success).toBe(false);
  });

  it("rejects an unsupported unit", () => {
    expect(AmountStringSchema.safeParse("2 USDC").success).toBe(false);
  });

  it("rejects leading content before the value", () => {
    expect(AmountStringSchema.safeParse("x2 MON").success).toBe(false);
  });

  it("rejects trailing content after the unit", () => {
    expect(AmountStringSchema.safeParse("2 MON extra").success).toBe(false);
  });

  it("rejects a non-string", () => {
    expect(AmountStringSchema.safeParse(2).success).toBe(false);
  });

  it("reports a helpful error message", () => {
    const result = AmountStringSchema.safeParse("nope");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('expected an amount like "2 MON"');
  });
});

describe("AmountRangeStringSchema", () => {
  it("accepts a single MON amount", () => {
    expect(AmountRangeStringSchema.safeParse("2 MON").success).toBe(true);
  });

  it("accepts a MON range", () => {
    expect(AmountRangeStringSchema.safeParse("0.1-1 MON").success).toBe(true);
  });

  it("accepts a single SOL amount (deferred Solana path)", () => {
    expect(AmountRangeStringSchema.safeParse("2 SOL").success).toBe(true);
  });

  it("accepts a SOL range (deferred Solana path)", () => {
    expect(AmountRangeStringSchema.safeParse("0.1-1 SOL").success).toBe(true);
  });

  it("accepts more than one space between the value and the unit", () => {
    expect(AmountRangeStringSchema.safeParse("0.1-1  MON").success).toBe(true);
  });

  it("rejects a malformed range", () => {
    expect(AmountRangeStringSchema.safeParse("0.1- MON").success).toBe(false);
  });

  it("rejects leading content before the value", () => {
    expect(AmountRangeStringSchema.safeParse("x2 MON").success).toBe(false);
  });

  it("rejects trailing content after the unit", () => {
    expect(AmountRangeStringSchema.safeParse("2 MON extra").success).toBe(false);
  });

  it("reports a helpful error message", () => {
    const result = AmountRangeStringSchema.safeParse("nope");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'expected an amount like "2 MON" or a range like "0.1-1 MON"',
    );
  });
});

describe("BaseUnitsStringSchema", () => {
  it("accepts a plain integer string", () => {
    expect(BaseUnitsStringSchema.safeParse("1073000000000000").success).toBe(true);
  });

  it("accepts a decimal string", () => {
    expect(BaseUnitsStringSchema.safeParse("1000.5").success).toBe(true);
  });

  it("accepts a decimal string with more than one fractional digit", () => {
    expect(BaseUnitsStringSchema.safeParse("1000.55").success).toBe(true);
  });

  it("rejects a string with an underscore separator", () => {
    expect(BaseUnitsStringSchema.safeParse("1_000_000").success).toBe(false);
  });

  it("rejects a string with a unit suffix", () => {
    expect(BaseUnitsStringSchema.safeParse("1000 SOL").success).toBe(false);
  });

  it("rejects a decimal point with no fractional digits", () => {
    expect(BaseUnitsStringSchema.safeParse("1000.").success).toBe(false);
  });

  it("reports a helpful error message", () => {
    const result = BaseUnitsStringSchema.safeParse("nope");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('expected a plain decimal string like "1000000"');
  });
});

describe("BaseUnitsRangeStringSchema", () => {
  it("accepts a single plain decimal", () => {
    expect(BaseUnitsRangeStringSchema.safeParse("1000000").success).toBe(true);
  });

  it("accepts a range", () => {
    expect(BaseUnitsRangeStringSchema.safeParse("100-200").success).toBe(true);
  });

  it("accepts a decimal range", () => {
    expect(BaseUnitsRangeStringSchema.safeParse("100.5-200.5").success).toBe(true);
  });

  it("rejects a string with a unit suffix", () => {
    expect(BaseUnitsRangeStringSchema.safeParse("100-200 SOL").success).toBe(false);
  });

  it("rejects a malformed range", () => {
    expect(BaseUnitsRangeStringSchema.safeParse("100-").success).toBe(false);
  });

  it("reports a helpful error message", () => {
    const result = BaseUnitsRangeStringSchema.safeParse("nope");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'expected a plain decimal or range like "1000000" or "100-200"',
    );
  });
});

describe("PercentStringSchema", () => {
  it("accepts a whole percentage", () => {
    expect(PercentStringSchema.safeParse("5%").success).toBe(true);
  });

  it("accepts a fractional percentage", () => {
    expect(PercentStringSchema.safeParse("0.5%").success).toBe(true);
  });

  it("rejects a missing % suffix", () => {
    expect(PercentStringSchema.safeParse("5").success).toBe(false);
  });

  it("rejects leading content before the value", () => {
    expect(PercentStringSchema.safeParse("x5%").success).toBe(false);
  });

  it("rejects trailing content after the %", () => {
    expect(PercentStringSchema.safeParse("5% extra").success).toBe(false);
  });

  it("reports a helpful error message", () => {
    const result = PercentStringSchema.safeParse("nope");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('expected a percentage like "5%"');
  });
});

describe("DurationStringSchema", () => {
  it("accepts an hour duration", () => {
    expect(DurationStringSchema.safeParse("6h").success).toBe(true);
  });

  it("accepts a minute duration", () => {
    expect(DurationStringSchema.safeParse("90m").success).toBe(true);
  });

  it("rejects an unsupported unit", () => {
    expect(DurationStringSchema.safeParse("6x").success).toBe(false);
  });

  it("rejects leading content before the value", () => {
    expect(DurationStringSchema.safeParse("x6h").success).toBe(false);
  });

  it("rejects trailing content after the unit", () => {
    expect(DurationStringSchema.safeParse("6h extra").success).toBe(false);
  });

  it("reports a helpful error message", () => {
    const result = DurationStringSchema.safeParse("nope");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('expected a duration like "6h"');
  });
});

describe("SlotOrDurationStringSchema", () => {
  it("accepts a relative duration", () => {
    expect(SlotOrDurationStringSchema.safeParse("16h").success).toBe(true);
  });

  it("accepts an absolute slot", () => {
    expect(SlotOrDurationStringSchema.safeParse("slot:0").success).toBe(true);
  });

  it("accepts a multi-digit absolute slot", () => {
    expect(SlotOrDurationStringSchema.safeParse("slot:42").success).toBe(true);
  });

  it("accepts an absolute hour", () => {
    expect(SlotOrDurationStringSchema.safeParse("hour:31").success).toBe(true);
  });

  it("rejects a bare number", () => {
    expect(SlotOrDurationStringSchema.safeParse("31").success).toBe(false);
  });

  it("rejects leading content before any of the three forms", () => {
    expect(SlotOrDurationStringSchema.safeParse("xslot:0").success).toBe(false);
  });

  it("rejects trailing content after any of the three forms", () => {
    expect(SlotOrDurationStringSchema.safeParse("slot:0 extra").success).toBe(false);
  });

  it("reports a helpful error message", () => {
    const result = SlotOrDurationStringSchema.safeParse("nope");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('expected "6h", "slot:0", or "hour:31"');
  });
});
