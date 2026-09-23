const UINT32_MAX = 2 ** 32 - 1;

/**
 * A deterministic pseudo-random source (docs/08: no `Math.random()` in
 * `core`). Every actor gets its own independent stream via {@link Rng.fork},
 * so adding an actor never changes the draws of existing actors (docs/03).
 */
export interface Rng {
  /** The next value in [0, 1). */
  readonly next: () => number;
  /** The next integer in [0, maxExclusive). */
  readonly nextInt: (maxExclusive: number) => number;
  /** An independent, deterministic child stream, derived from this stream's seed and `id`. */
  readonly fork: (id: string) => Rng;
}

/** mulberry32: a small, fast, deterministic PRNG. Not cryptographic. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a: a small, fast, deterministic string hash, used to derive fork seeds. */
function fnv1a32(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Creates a deterministic {@link Rng} from a seed.
 *
 * @param seed - A uint32 seed.
 * @throws {RangeError} If `seed` is not a uint32.
 * @example
 * ```ts
 * const rng = createRng(42);
 * rng.next(); // always the same value for seed 42
 * ```
 */
export function createRng(seed: number): Rng {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > UINT32_MAX) {
    throw new RangeError("createRng: seed must be a uint32");
  }
  const next = mulberry32(seed);
  return {
    next,
    nextInt(maxExclusive: number): number {
      if (!Number.isInteger(maxExclusive)) {
        throw new RangeError("Rng.nextInt: maxExclusive must be an integer");
      }
      if (maxExclusive <= 0) {
        throw new RangeError("Rng.nextInt: maxExclusive must be positive");
      }
      return Math.floor(next() * maxExclusive);
    },
    fork(id: string): Rng {
      return createRng((seed ^ fnv1a32(id)) >>> 0);
    },
  };
}
