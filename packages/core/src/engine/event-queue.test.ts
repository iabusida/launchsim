import { describe, it, expect } from "vitest";
import { createEventQueue } from "./event-queue.js";

describe("createEventQueue", () => {
  it("starts empty", () => {
    const queue = createEventQueue<string>();
    expect(queue.isEmpty()).toBe(true);
    expect(queue.peekSlot()).toBeNull();
    expect(queue.popAllAtNextSlot()).toEqual([]);
  });

  it("schedules and pops a single event", () => {
    const queue = createEventQueue<string>();
    queue.schedule(5, "a");
    expect(queue.isEmpty()).toBe(false);
    expect(queue.peekSlot()).toBe(5);
    expect(queue.popAllAtNextSlot()).toEqual([{ slot: 5, sequence: 0, payload: "a" }]);
    expect(queue.isEmpty()).toBe(true);
  });

  it("pops all events at the earliest slot, ordered by scheduling sequence", () => {
    const queue = createEventQueue<string>();
    queue.schedule(5, "first");
    queue.schedule(5, "second");
    queue.schedule(5, "third");
    const due = queue.popAllAtNextSlot();
    expect(due.map((e) => e.payload)).toEqual(["first", "second", "third"]);
    expect(due.map((e) => e.sequence)).toEqual([0, 1, 2]);
  });

  it("leaves later-slot events queued after popping the earliest slot", () => {
    const queue = createEventQueue<string>();
    queue.schedule(10, "later");
    queue.schedule(5, "earlier");
    expect(queue.popAllAtNextSlot()).toEqual([{ slot: 5, sequence: 1, payload: "earlier" }]);
    expect(queue.peekSlot()).toBe(10);
    expect(queue.popAllAtNextSlot()).toEqual([{ slot: 10, sequence: 0, payload: "later" }]);
    expect(queue.isEmpty()).toBe(true);
  });

  it("keeps sequence ordering independent of scheduling order across slots", () => {
    const queue = createEventQueue<string>();
    queue.schedule(1, "slot1-a"); // sequence 0
    queue.schedule(2, "slot2-a"); // sequence 1
    queue.schedule(1, "slot1-b"); // sequence 2
    const due = queue.popAllAtNextSlot();
    expect(due.map((e) => e.payload)).toEqual(["slot1-a", "slot1-b"]);
  });

  it("throws when scheduling a negative slot", () => {
    const queue = createEventQueue<string>();
    expect(() => { queue.schedule(-1, "x"); }).toThrow(/non-negative/);
  });

  it("throws when scheduling a non-integer slot", () => {
    const queue = createEventQueue<string>();
    expect(() => { queue.schedule(1.5, "x"); }).toThrow(/safe integer/);
  });
});
