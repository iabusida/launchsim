/** A scheduled event, keyed by `(slot, sequence)` for deterministic ordering (docs/01). */
export interface ScheduledEvent<T> {
  readonly slot: number;
  readonly sequence: number;
  readonly payload: T;
}

/**
 * A priority queue of events keyed by `(slot, sequence)`. `sequence` -- a
 * monotonically increasing counter assigned at scheduling time -- breaks
 * ties between same-slot events deterministically (docs/01).
 */
export interface EventQueue<T> {
  /** Schedules `payload` to fire at `slot`. */
  readonly schedule: (slot: number, payload: T) => void;
  readonly isEmpty: () => boolean;
  /** The earliest slot with a due event, or `null` if the queue is empty. */
  readonly peekSlot: () => number | null;
  /** Removes and returns every event at the earliest slot, ordered by `sequence`. */
  readonly popAllAtNextSlot: () => ScheduledEvent<T>[];
}

/** Orders events by `(slot, sequence)`, ascending. */
function compareEvents<T>(a: ScheduledEvent<T>, b: ScheduledEvent<T>): number {
  return a.slot !== b.slot ? a.slot - b.slot : a.sequence - b.sequence;
}

/**
 * Creates an empty {@link EventQueue}, backed by a binary min-heap so
 * `schedule`/pop are `O(log n)` -- a linear scan per operation would make
 * a long scenario with many scheduled actors quadratic overall (a real
 * regression this project hit: 306 actors over a 48h/400ms-slot scenario
 * took ~20s with a linear-scan queue, well over docs/01's "well under a
 * second").
 *
 * @example
 * ```ts
 * const queue = createEventQueue<Order>();
 * queue.schedule(0, order);
 * queue.popAllAtNextSlot(); // [order], in scheduling order
 * ```
 */
export function createEventQueue<T>(): EventQueue<T> {
  const heap: ScheduledEvent<T>[] = [];
  let nextSequence = 0;

  function swap(i: number, j: number): void {
    const a = heap[i];
    const b = heap[j];
    /* v8 ignore next 3 -- coverage-ignore: unreachable, siftUp/siftDown only ever call swap with indices their own bounds checks already proved valid; this exists only for TS's noUncheckedIndexedAccess. */
    if (a === undefined || b === undefined) {
      return;
    }
    heap[i] = b;
    heap[j] = a;
  }

  function siftUp(startIndex: number): void {
    let index = startIndex;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      const current = heap[index];
      const parentEvent = heap[parent];
      if (!current || !parentEvent || compareEvents(current, parentEvent) >= 0) {
        break;
      }
      swap(index, parent);
      index = parent;
    }
  }

  function siftDown(startIndex: number): void {
    let index = startIndex;
    for (;;) {
      const left = index * 2 + 1;
      const right = index * 2 + 2;
      let smallest = index;
      const smallestEvent = heap[smallest];
      const leftEvent = heap[left];
      const rightEvent = heap[right];
      if (left < heap.length && leftEvent && smallestEvent && compareEvents(leftEvent, smallestEvent) < 0) {
        smallest = left;
      }
      const smallestSoFar = heap[smallest];
      if (
        right < heap.length &&
        rightEvent &&
        smallestSoFar &&
        compareEvents(rightEvent, smallestSoFar) < 0
      ) {
        smallest = right;
      }
      if (smallest === index) {
        break;
      }
      swap(index, smallest);
      index = smallest;
    }
  }

  function popMin(): ScheduledEvent<T> | undefined {
    const top = heap[0];
    const last = heap.pop();
    /* v8 ignore next 3 -- coverage-ignore: unreachable, popAllAtNextSlot only calls popMin while heap[0] is confirmed present; this exists only for TS's noUncheckedIndexedAccess. */
    if (top === undefined) {
      return undefined;
    }
    if (last !== undefined && heap.length > 0) {
      heap[0] = last;
      siftDown(0);
    }
    return top;
  }

  return {
    schedule(slot: number, payload: T): void {
      if (!Number.isSafeInteger(slot)) {
        throw new RangeError("EventQueue.schedule: slot must be a safe integer");
      }
      if (slot < 0) {
        throw new RangeError("EventQueue.schedule: slot must be non-negative");
      }
      heap.push({ slot, sequence: nextSequence, payload });
      nextSequence += 1;
      siftUp(heap.length - 1);
    },
    isEmpty(): boolean {
      return heap.length === 0;
    },
    peekSlot(): number | null {
      return heap[0]?.slot ?? null;
    },
    popAllAtNextSlot(): ScheduledEvent<T>[] {
      const firstSlot = heap[0]?.slot;
      if (firstSlot === undefined) {
        return [];
      }
      const due: ScheduledEvent<T>[] = [];
      // The heap always yields the global (slot, sequence) minimum next, so
      // repeated pops while the slot matches come out already in sequence order.
      while (heap[0]?.slot === firstSlot) {
        const event = popMin();
        /* v8 ignore next -- coverage-ignore: unreachable, the while condition already proved heap[0] is present, so popMin() cannot return undefined here; this exists only because popMin()'s return type is T | undefined. */
        if (event) {
          due.push(event);
        }
      }
      return due;
    },
  };
}
