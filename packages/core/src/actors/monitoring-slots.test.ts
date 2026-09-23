import { describe, it, expect } from "vitest";
import { monitoringSlots } from "./monitoring-slots.js";

describe("monitoringSlots", () => {
  it("returns slots from start to end at the given step, inclusive of both ends", () => {
    expect(monitoringSlots(0, 10, 5)).toEqual([0, 5, 10]);
  });

  it("includes end even when it doesn't land exactly on a step", () => {
    expect(monitoringSlots(0, 12, 5)).toEqual([0, 5, 10, 12]);
  });

  it("returns a single slot when start equals end", () => {
    expect(monitoringSlots(5, 5, 5)).toEqual([5]);
  });

  it("throws when end is before start", () => {
    expect(() => monitoringSlots(10, 5, 1)).toThrow(/end must be/);
  });

  it("throws when step is not positive", () => {
    expect(() => monitoringSlots(0, 10, 0)).toThrow(/step must be positive/);
  });
});
