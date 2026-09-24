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
  // `compareEvents` never returns exactly 0 for two distinct heap entries:
  // `sequence` is a single monotonic counter shared by every `schedule`
  // call, so no two scheduled events ever share a (slot, sequence) pair,
  // and the heap never compares an element against itself. Below, this
  // means a `< 0` vs `<= 0` (or `>= 0` vs `> 0`) comparison-operator
  // mutant on a `compareEvents` result is unobservable. Verified
  // 2026-09-24 by directly applying each mutation to this file and running
  // the real test suite (not just Stryker) -- confirmed equivalent, not a
  // gap. (Two nearby LogicalOperator mutants in siftDown were NOT
  // equivalent by this same check despite Stryker also reporting them
  // survived -- see the notes there; don't assume Stryker's own verdict
  // without checking.)
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
    // Stryker disable next-line ConditionalExpression,LogicalOperator,BlockStatement: same
    // unreachability as the v8-ignore note below. Verified 2026-09-24 directly.
    /* v8 ignore next 3 -- coverage-ignore: unreachable, siftUp/siftDown only ever call swap with indices their own bounds checks already proved valid; this exists only for TS's noUncheckedIndexedAccess. */
    if (a === undefined || b === undefined) {
      return;
    }
    heap[i] = b;
    heap[j] = a;
  }

  function siftUp(startIndex: number): void {
    let index = startIndex;
    // Stryker disable next-line EqualityOperator: `index >= 0` would run one
    // extra iteration at index 0, where `parent = (0 - 1) >> 1 === -1`;
    // `heap[-1]` is undefined, so `!parentEvent` is true and the loop
    // breaks immediately with no swap -- unobservable. Verified 2026-09-24
    // directly (also exercised by event-queue.prop.test.ts's stress test).
    while (index > 0) {
      const parent = (index - 1) >> 1;
      const current = heap[index];
      const parentEvent = heap[parent];
      // Stryker disable next-line ConditionalExpression,LogicalOperator,EqualityOperator:
      // `current`/`parentEvent` are never actually undefined here (index
      // only ever visits populated slots between startIndex and 0), so
      // `!current || !parentEvent` is always false and this reduces to
      // `compareEvents(...) >= 0` either way; see compareEvents' own note
      // on why `>= 0` vs `> 0` is also unobservable. Verified 2026-09-24
      // directly, not just via Stryker's own (occasionally wrong) report.
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
      // Stryker disable next-line ConditionalExpression,EqualityOperator: `left
      // < heap.length` vs `<=`, or forced `true`, is unobservable because
      // `leftEvent`'s truthiness already correlates exactly with that same
      // bound (in-bounds slots hold a truthy object; out-of-bounds reads
      // undefined) -- the trailing `&& leftEvent` catches it either way.
      // `compareEvents(...) < 0` vs `<= 0` is unobservable per compareEvents'
      // own note (leftEvent and smallestEvent are always distinct slots
      // here). Verified 2026-09-24 by directly mutating and running the
      // real test suite -- NOT just trusting Stryker's report, which
      // (misleadingly) also flagged the `&&`-to-`||` LogicalOperator mutant
      // on this exact line as "survived" even though it's real: an
      // existing test does catch it directly (confirmed by direct
      // reproduction), so that mutator is deliberately left unignored here.
      if (left < heap.length && leftEvent && smallestEvent && compareEvents(leftEvent, smallestEvent) < 0) {
        smallest = left;
      }
      const smallestSoFar = heap[smallest];
      if (
        // Stryker disable next-line ConditionalExpression,EqualityOperator: same
        // reasoning as the left-child check above, mirrored for right (and
        // same deliberate omission of LogicalOperator -- see that note).
        right < heap.length &&
        rightEvent &&
        smallestSoFar &&
        // Stryker disable next-line EqualityOperator: see compareEvents'
        // own note -- rightEvent and smallestSoFar are always distinct
        // slots here, so `< 0` vs `<= 0` is unobservable.
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
    // Stryker disable next-line ConditionalExpression: same unreachability
    // as the v8-ignore note below. Verified 2026-09-24 directly.
    /* v8 ignore next 3 -- coverage-ignore: unreachable, popAllAtNextSlot only calls popMin while heap[0] is confirmed present; this exists only for TS's noUncheckedIndexedAccess. */
    if (top === undefined) {
      return undefined;
    }
    // Stryker disable next-line ConditionalExpression: forcing just the
    // `last !== undefined` sub-clause to `true` is unobservable -- `top`
    // being defined above already proves the heap had >=1 element before
    // `pop()`, so `pop()` on a non-empty array is never undefined here
    // either. (The other clause, `heap.length > 0`, IS load-bearing --
    // don't extend this ignore to cover the whole condition. Verified
    // 2026-09-24 by direct mutation: forcing the *whole* condition true
    // makes popping the queue down to empty resurrect the last-popped
    // element, corrupting the heap -- caught by existing tests.)
    if (last !== undefined && heap.length > 0) {
      // (This block's body is also load-bearing, same as the condition
      // above: emptying it -- BlockStatement -- lets the heap keep the
      // just-popped top as a stale root. Confirmed by direct mutation;
      // caught by existing tests, so deliberately not Stryker-ignored,
      // same as the two siftDown LogicalOperator mutants noted above.)
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
        // Stryker disable next-line ConditionalExpression: same
        // unreachability as the v8-ignore note below. Verified 2026-09-24 directly.
        /* v8 ignore next -- coverage-ignore: unreachable, the while condition already proved heap[0] is present, so popMin() cannot return undefined here; this exists only because popMin()'s return type is T | undefined. */
        if (event) {
          due.push(event);
        }
      }
      return due;
    },
  };
}
