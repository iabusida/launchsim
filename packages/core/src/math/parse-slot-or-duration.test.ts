import { describe, it, expect } from "vitest";
import { parseSlotOrDuration } from "./parse-slot-or-duration.js";

describe("parseSlotOrDuration", () => {
  it("parses an absolute slot", () => {
    expect(parseSlotOrDuration("slot:0", 400)).toBe(0);
  });

  it("parses a multi-digit absolute slot", () => {
    expect(parseSlotOrDuration("slot:42", 400)).toBe(42);
  });

  it("parses an absolute hour into slots", () => {
    // 1 hour = 3_600_000ms / 400ms = 9_000 slots per hour
    expect(parseSlotOrDuration("hour:1", 400)).toBe(9_000);
  });

  it("parses a relative duration into slots", () => {
    expect(parseSlotOrDuration("6h", 400)).toBe(54_000);
  });

  it("throws on a malformed input", () => {
    expect(() => parseSlotOrDuration("nope", 400)).toThrow(/invalid/);
  });

  it("throws on a negative absolute slot", () => {
    expect(() => parseSlotOrDuration("slot:-1", 400)).toThrow(/invalid/);
  });

  it("trims surrounding whitespace", () => {
    expect(parseSlotOrDuration("  slot:0  ", 400)).toBe(0);
  });

  it("parses a multi-digit absolute hour into slots", () => {
    expect(parseSlotOrDuration("hour:12", 400)).toBe(108_000);
  });

  it("rejects leading content before an absolute slot", () => {
    expect(() => parseSlotOrDuration("xslot:0", 400)).toThrow(/invalid/);
  });

  it("rejects trailing content after an absolute slot", () => {
    expect(() => parseSlotOrDuration("slot:0extra", 400)).toThrow(/invalid/);
  });

  it("rejects leading content before an absolute hour", () => {
    expect(() => parseSlotOrDuration("xhour:1", 400)).toThrow(/invalid/);
  });

  it("rejects trailing content after an absolute hour", () => {
    expect(() => parseSlotOrDuration("hour:1extra", 400)).toThrow(/invalid/);
  });
});
