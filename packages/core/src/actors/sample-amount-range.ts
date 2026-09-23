import type { Rng } from "../engine/rng.js";

/** One `Rng.nextInt` draw's worth of entropy: a uniform uint32. */
const CHUNK_EXCLUSIVE = 0x100000000; // 2^32
const CHUNK_BITS = 32n;

/** The number of bits needed to represent every value in `[0, n]`. */
function bitLength(n: bigint): bigint {
  let bits = 0n;
  for (let v = n; v > 0n; v >>= 1n) {
    bits++;
  }
  return bits;
}

/**
 * Draws a uniform bigint in `[0, maxExclusive)` from `rng`, by composing
 * just enough 32-bit chunks (`rng.nextInt(2^32)`) to cover `maxExclusive`'s
 * bit length, masking down to exactly that many bits, and rejecting and
 * resampling a draw that still lands at or above `maxExclusive` -- the
 * standard mask-and-reject technique, unbiased and never worse than a 50%
 * rejection rate, unlike scaling a single float draw (which cannot cover
 * a range wider than a float's precision).
 */
function nextBigIntBelow(rng: Rng, maxExclusive: bigint): bigint {
  const bits = bitLength(maxExclusive - 1n);
  const chunks = (bits + CHUNK_BITS - 1n) / CHUNK_BITS;
  const mask = (1n << bits) - 1n;
  for (;;) {
    let value = 0n;
    for (let i = 0n; i < chunks; i++) {
      value = (value << CHUNK_BITS) | BigInt(rng.nextInt(CHUNK_EXCLUSIVE));
    }
    value &= mask;
    if (value < maxExclusive) {
      return value;
    }
  }
}

/**
 * Samples a uniform bigint in `[min, max]` using `rng`. Unbounded in the
 * width of the range (docs/06: quote units up to 18 decimals need ranges
 * far wider than `Number.MAX_SAFE_INTEGER` allows), via {@link nextBigIntBelow}.
 *
 * @throws {RangeError} If `max < min`.
 */
export function sampleAmountRange(rng: Rng, min: bigint, max: bigint): bigint {
  if (max < min) {
    throw new RangeError("sampleAmountRange: max must be at or above min");
  }
  const width = max - min;
  if (width === 0n) {
    return min;
  }
  return min + nextBigIntBelow(rng, width + 1n);
}
