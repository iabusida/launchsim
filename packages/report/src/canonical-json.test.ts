import { describe, it, expect } from "vitest";
import { toCanonicalJson } from "./canonical-json.js";

describe("toCanonicalJson", () => {
  it("serializes bigint values as decimal strings", () => {
    expect(toCanonicalJson({ amount: 123n })).toBe('{"amount":"123"}');
  });

  it("serializes object keys in sorted order, regardless of insertion order", () => {
    expect(toCanonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("sorts keys recursively in nested objects", () => {
    expect(toCanonicalJson({ z: { d: 1, c: 2 }, a: 1 })).toBe('{"a":1,"z":{"c":2,"d":1}}');
  });

  it("preserves array order (arrays are not sorted)", () => {
    expect(toCanonicalJson({ list: [3, 1, 2] })).toBe('{"list":[3,1,2]}');
  });

  it("sorts keys of objects nested inside arrays", () => {
    expect(toCanonicalJson([{ b: 1, a: 2 }])).toBe('[{"a":2,"b":1}]');
  });

  it("handles null and primitive values", () => {
    expect(toCanonicalJson({ a: null, b: "x", c: true, d: 1 })).toBe(
      '{"a":null,"b":"x","c":true,"d":1}',
    );
  });

  it("produces byte-identical output for the same input across calls", () => {
    const value = { seed: 42n, name: "test", nested: { z: 1n, a: 2n } };
    expect(toCanonicalJson(value)).toBe(toCanonicalJson(value));
  });

  it("handles two distinct Map keys that stringify to the same value without erroring", () => {
    const map = new Map<number | string, string>([
      [1, "from-number-key"],
      ["1", "from-string-key"],
    ]);
    const result = toCanonicalJson({ m: map });
    expect(result === '{"m":{"1":"from-number-key"}}' || result === '{"m":{"1":"from-string-key"}}').toBe(
      true,
    );
  });

  it("serializes a Map as a sorted-key plain object", () => {
    const map = new Map<string, bigint>([
      ["b", 2n],
      ["a", 1n],
    ]);
    expect(toCanonicalJson({ wallets: map })).toBe('{"wallets":{"a":"1","b":"2"}}');
  });
});
