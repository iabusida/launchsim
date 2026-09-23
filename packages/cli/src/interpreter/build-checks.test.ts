import { describe, it, expect } from "vitest";
import { buildChecks } from "./build-checks.js";

const SLOT_MS = 400;

describe("buildChecks", () => {
  it("builds a quoteNeverBelowPctOfPeak check", () => {
    const [check] = buildChecks([{ kind: "quoteNeverBelowPctOfPeak", bps: 5_000 }], SLOT_MS);
    expect(check?.id).toBe("quoteNeverBelowPctOfPeak");
  });

  it("builds a groupSupplyShareBelow check", () => {
    const [check] = buildChecks(
      [{ kind: "groupSupplyShareBelow", group: "sniper", at: "1m", bps: 1_000 }],
      SLOT_MS,
    );
    expect(check?.id).toBe("groupSupplyShareBelow");
  });

  it("builds a maxDrawdownBelow check", () => {
    const [check] = buildChecks([{ kind: "maxDrawdownBelow", bps: 8_000, window: "1h" }], SLOT_MS);
    expect(check?.id).toBe("maxDrawdownBelow");
  });

  it("returns an empty array for no checks", () => {
    expect(buildChecks([], SLOT_MS)).toEqual([]);
  });
});
