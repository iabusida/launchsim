import { describe, it, expect } from "vitest";
import { createClock } from "./clock.js";

describe("createClock", () => {
  it("starts at slot 0", () => {
    const clock = createClock(400);
    expect(clock.now()).toBe(0);
  });

  it("exposes the slot length it was created with", () => {
    const clock = createClock(400);
    expect(clock.slotMs).toBe(400);
  });

  it("throws when slotMs is not a positive safe integer", () => {
    expect(() => createClock(0)).toThrow(/positive/);
  });

  it("throws when slotMs is not an integer", () => {
    expect(() => createClock(1.5)).toThrow(/safe integer/);
  });
});

describe("Clock.advanceTo", () => {
  it("moves the current slot forward", () => {
    const clock = createClock(400);
    clock.advanceTo(150);
    expect(clock.now()).toBe(150);
  });

  it("allows advancing to the same slot (a no-op)", () => {
    const clock = createClock(400);
    clock.advanceTo(150);
    clock.advanceTo(150);
    expect(clock.now()).toBe(150);
  });

  it("throws when moving backward", () => {
    const clock = createClock(400);
    clock.advanceTo(150);
    expect(() => { clock.advanceTo(100); }).toThrow(/backward/);
  });

  it("throws when the target slot is negative", () => {
    const clock = createClock(400);
    expect(() => { clock.advanceTo(-1); }).toThrow(/non-negative/);
  });

  it("throws when the target slot is not an integer", () => {
    const clock = createClock(400);
    expect(() => { clock.advanceTo(1.5); }).toThrow(/safe integer/);
  });
});
