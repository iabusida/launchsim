import { describe, it, expect } from "vitest";
import { ScenarioConfigSchema } from "@launchsim/core";
import { findSmallestBreak } from "./red-team.js";

function scenario(actors: unknown[], checks: unknown[] = [{ kind: "groupSupplyShareBelow", group: "sniper", at: "10m", bps: 1000 }]) {
  return ScenarioConfigSchema.parse({
    schemaVersion: 1,
    name: "red team target",
    seed: 1,
    duration: "1h",
    token: { supply: "1000000" },
    market: { kind: "cpmm", quote: "30 MON", base: "1073000000000000", feeBps: "1%" },
    actors,
    checks,
  });
}

describe("findSmallestBreak", () => {
  it("finds the smallest sniper count that breaks a group supply share check", () => {
    const config = scenario([{ group: "sniper", count: 1, spend: "1 MON", at: "slot:0", holdSlots: 5000 }]);
    const result = findSmallestBreak(config, 0, "groupSupplyShareBelow", { min: 1, max: 10 });
    expect(result.found).toBe(true);
    expect(result.breakingValue).not.toBeNull();
    expect(typeof result.breakingValue).toBe("number");
  });

  it("reports not found when no value in range breaks the check", () => {
    // A large retail contingent dilutes the sniper group's share well
    // below the (generous) 90% threshold across the whole search range.
    const config = scenario(
      [
        { group: "retail", count: 100, spend: "1 MON", over: "1m" },
        { group: "sniper", count: 1, spend: "1 MON", at: "slot:0", holdSlots: 5000 },
      ],
      [{ kind: "groupSupplyShareBelow", group: "sniper", at: "10m", bps: 9000 }],
    );
    const result = findSmallestBreak(config, 1, "groupSupplyShareBelow", { min: 1, max: 3 });
    expect(result.found).toBe(false);
    expect(result.breakingValue).toBeNull();
  });

  it("throws a clear error when the check kind doesn't exist in the baseline scenario", () => {
    const config = scenario([{ group: "sniper", count: 1, spend: "1 MON", at: "slot:0", holdSlots: 5000 }]);
    expect(() =>
      findSmallestBreak(config, 0, "maxDrawdownBelow", { min: 1, max: 5 }),
    ).toThrow(/no check of kind/);
  });

  it("throws a clear error when the targeted actor has no `count` field", () => {
    const config = scenario([{ group: "whale", spend: "50 MON" }]);
    expect(() =>
      findSmallestBreak(config, 0, "groupSupplyShareBelow", { min: 1, max: 5 }),
    ).toThrow(/has no "count" field/);
  });

  it("throws a clear error when the actor index is out of range", () => {
    const config = scenario([{ group: "sniper", count: 1, spend: "1 MON", at: "slot:0", holdSlots: 5000 }]);
    expect(() =>
      findSmallestBreak(config, 5, "groupSupplyShareBelow", { min: 1, max: 5 }),
    ).toThrow(/has no "count" field/);
  });
});
