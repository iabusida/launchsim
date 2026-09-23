import { describe, it, expect } from "vitest";
import { renderLineChart } from "./render-line-chart.js";

const OPTS = { width: 100, height: 50, strokeColor: "var(--chart-line)" };

describe("renderLineChart", () => {
  it("returns an empty (but valid) svg for an empty series", () => {
    const svg = renderLineChart([], OPTS);
    expect(svg).toContain("<svg");
    expect(svg).toContain('viewBox="0 0 100 50"');
    expect(svg).not.toContain("<polyline");
  });

  it("renders a polyline with one coordinate pair per point", () => {
    const svg = renderLineChart(
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 },
      ],
      OPTS,
    );
    const match = /points="([^"]+)"/.exec(svg);
    expect(match?.[1]?.trim().split(/\s+/)).toHaveLength(3);
  });

  it("uses the given stroke color", () => {
    const svg = renderLineChart([{ x: 0, y: 0 }], OPTS);
    expect(svg).toContain('stroke="var(--chart-line)"');
  });

  it("rounds coordinates to 2 decimal places", () => {
    const svg = renderLineChart(
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 3, y: 2 },
      ],
      OPTS,
    );
    const match = /points="([^"]+)"/.exec(svg);
    const coords = match?.[1]?.trim().split(/\s+/).flatMap((pair) => pair.split(","));
    for (const coord of coords ?? []) {
      const decimals = coord.split(".")[1];
      expect(!decimals || decimals.length <= 2).toBe(true);
    }
  });

  it("places a single point at the center of the viewBox", () => {
    const svg = renderLineChart([{ x: 5, y: 5 }], OPTS);
    const match = /points="([^"]+)"/.exec(svg);
    expect(match?.[1]?.trim()).toBe("50,25");
  });

  it("is deterministic: the same series renders identical SVG", () => {
    const series = [
      { x: 0, y: 3 },
      { x: 1, y: 7 },
    ];
    expect(renderLineChart(series, OPTS)).toBe(renderLineChart(series, OPTS));
  });

  it("does not escape into unsafe markup for the given stroke color (trusted, caller-controlled CSS var)", () => {
    const svg = renderLineChart([{ x: 0, y: 0 }], OPTS);
    expect(svg).not.toContain("<script");
  });
});
