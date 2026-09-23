import { describe, it, expect } from "vitest";
import { formatBps } from "./format-bps.js";

describe("formatBps", () => {
  it("formats a whole percentage", () => {
    expect(formatBps(3_400n)).toBe("34%");
  });

  it("formats a fractional percentage", () => {
    expect(formatBps(50n)).toBe("0.5%");
  });

  it("formats zero", () => {
    expect(formatBps(0n)).toBe("0%");
  });

  it("formats 100%", () => {
    expect(formatBps(10_000n)).toBe("100%");
  });

  it("drops a trailing zero fractional digit", () => {
    expect(formatBps(3_450n)).toBe("34.5%");
  });

  it("keeps two fractional digits when both are significant", () => {
    expect(formatBps(3_456n)).toBe("34.56%");
  });

  it("throws on a negative value", () => {
    expect(() => formatBps(-1n)).toThrow(/non-negative/);
  });
});
