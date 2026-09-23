import type { ChartPoint } from "./downsample.js";

/** {@link renderLineChart}'s options. */
export interface LineChartOptions {
  readonly width: number;
  readonly height: number;
  /** A CSS color, typically a custom property (e.g. `"var(--chart-line)"`) so the chart follows light/dark mode. */
  readonly strokeColor: string;
  readonly padding?: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function scale(value: number, min: number, max: number, size: number, padding: number, invert: boolean): number {
  if (max === min) {
    return size / 2;
  }
  const fraction = (value - min) / (max - min);
  const position = padding + fraction * (size - 2 * padding);
  return invert ? size - position : position;
}

/**
 * Renders `series` as an inline SVG line chart (docs/04): no chart
 * library, no CDN. Coordinates are rounded to 2 decimals for
 * deterministic output (docs/07). Callers downsample first (see
 * `downsample.ts`) -- this function renders whatever it's given.
 *
 * @example
 * ```ts
 * renderLineChart([{ x: 0, y: 1 }, { x: 1, y: 2 }], { width: 600, height: 200, strokeColor: "var(--chart-line)" });
 * ```
 */
export function renderLineChart(series: readonly ChartPoint[], opts: LineChartOptions): string {
  const svgOpen = `<svg viewBox="0 0 ${String(opts.width)} ${String(opts.height)}" xmlns="http://www.w3.org/2000/svg">`;
  if (series.length === 0) {
    return `${svgOpen}</svg>`;
  }
  const padding = opts.padding ?? 8;
  const xs = series.map((point) => point.x);
  const ys = series.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const points = series
    .map((point) => {
      const x = round2(scale(point.x, minX, maxX, opts.width, padding, false));
      const y = round2(scale(point.y, minY, maxY, opts.height, padding, true));
      return `${String(x)},${String(y)}`;
    })
    .join(" ");

  return `${svgOpen}<polyline points="${points}" fill="none" stroke="${opts.strokeColor}" stroke-width="2" /></svg>`;
}
