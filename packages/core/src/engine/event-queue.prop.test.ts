import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createEventQueue } from "./event-queue.js";

describe("createEventQueue (properties)", () => {
  it("always pops events in (slot, sequence) order, for any scheduling order and any number of events, including duplicate slots and deep heaps", () => {
    fc.assert(
      fc.property(fc.array(fc.nat({ max: 20 }), { minLength: 0, maxLength: 200 }), (slots) => {
        const queue = createEventQueue<number>();
        slots.forEach((slot, i) => {
          queue.schedule(slot, i);
        });

        // Expected: a stable sort by slot -- ties keep scheduling order,
        // exactly matching how `sequence` is assigned.
        const expected = slots
          .map((slot, sequence) => ({ slot, sequence }))
          .sort((a, b) => a.slot - b.slot || a.sequence - b.sequence);

        const actual: { slot: number; sequence: number }[] = [];
        while (!queue.isEmpty()) {
          for (const event of queue.popAllAtNextSlot()) {
            actual.push({ slot: event.slot, sequence: event.sequence });
          }
        }

        expect(actual).toEqual(expected);
      }),
      { seed: 42, numRuns: 300 },
    );
  });
});
