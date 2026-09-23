/**
 * The engine's simulated clock (docs/01, docs/08: no `Date.now()` in
 * `core`). Time advances only in whole slots, driven by the engine loop,
 * never by wall-clock time.
 */
export interface Clock {
  /** The nominal slot length in milliseconds this clock was created with. */
  readonly slotMs: number;
  /** The current slot. */
  readonly now: () => number;
  /** Moves the clock forward to `slot`. A no-op if `slot === now()`. */
  readonly advanceTo: (slot: number) => void;
}

/**
 * Creates a {@link Clock} starting at slot 0.
 *
 * @param slotMs - The nominal slot length in milliseconds. Must be a positive safe integer.
 * @throws {RangeError} If `slotMs` is not a positive safe integer.
 */
export function createClock(slotMs: number): Clock {
  if (!Number.isSafeInteger(slotMs)) {
    throw new RangeError("createClock: slotMs must be a safe integer");
  }
  if (slotMs <= 0) {
    throw new RangeError("createClock: slotMs must be positive");
  }
  let current = 0;
  return {
    slotMs,
    now(): number {
      return current;
    },
    advanceTo(slot: number): void {
      if (!Number.isSafeInteger(slot)) {
        throw new RangeError("Clock.advanceTo: slot must be a safe integer");
      }
      if (slot < 0) {
        throw new RangeError("Clock.advanceTo: slot must be non-negative");
      }
      if (slot < current) {
        throw new RangeError("Clock.advanceTo: cannot move backward");
      }
      current = slot;
    },
  };
}
