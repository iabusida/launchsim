/** A chart-ready point. `x`/`y` are `number` -- SVG coordinates are one of docs/08's documented exceptions to bigint. */
export interface ChartPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Downsamples `series` to at most `maxPoints`, using min/max bucketing:
 * the series is split into equal-width buckets, and each contributes its
 * lowest and highest point, so spikes survive instead of being averaged
 * away (docs/04). The first and last points are always preserved exactly.
 *
 * @throws {RangeError} If `maxPoints` is less than 2.
 */
export function downsample(series: readonly ChartPoint[], maxPoints: number): ChartPoint[] {
  if (maxPoints < 2) {
    throw new RangeError("downsample: maxPoints must be at least 2");
  }
  if (series.length <= maxPoints) {
    return [...series];
  }

  const bucketCount = Math.floor(maxPoints / 2);
  const bucketSize = series.length / bucketCount;
  const result: ChartPoint[] = [];

  for (let bucket = 0; bucket < bucketCount; bucket++) {
    const start = Math.floor(bucket * bucketSize);
    const end = bucket === bucketCount - 1 ? series.length : Math.floor((bucket + 1) * bucketSize);
    let minPoint = series[start];
    let maxPoint = series[start];
    for (let i = start; i < end; i++) {
      const point = series[i];
      /* v8 ignore next 3 -- coverage-ignore: unreachable, start/i/end are always within [0, series.length) by construction; this exists only for TS's noUncheckedIndexedAccess. */
      if (!point || !minPoint || !maxPoint) {
        continue;
      }
      if (point.y < minPoint.y) {
        minPoint = point;
      }
      if (point.y > maxPoint.y) {
        maxPoint = point;
      }
    }
    /* v8 ignore next 3 -- coverage-ignore: unreachable, start is always within [0, series.length) so series[start] always exists; this exists only for TS's noUncheckedIndexedAccess. */
    if (!minPoint || !maxPoint) {
      continue;
    }
    if (minPoint.x <= maxPoint.x) {
      result.push(minPoint, maxPoint);
    } else {
      result.push(maxPoint, minPoint);
    }
  }

  const first = series[0];
  const last = series[series.length - 1];
  /* v8 ignore next 3 -- coverage-ignore: unreachable, series.length > maxPoints >= 2 was already established above, so series[0] always exists and every bucket always contributes 2 points to result; this guard exists only for TS's noUncheckedIndexedAccess. */
  if (first && result.length > 0) {
    result[0] = first;
  }
  /* v8 ignore next 3 -- coverage-ignore: unreachable, series.length > maxPoints >= 2 was already established above, so series[last] always exists and every bucket always contributes 2 points to result; this guard exists only for TS's noUncheckedIndexedAccess. */
  if (last && result.length > 0) {
    result[result.length - 1] = last;
  }
  return result;
}
