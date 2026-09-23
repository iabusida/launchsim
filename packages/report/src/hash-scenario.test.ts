import { describe, it, expect } from "vitest";
import { hashScenario } from "./hash-scenario.js";

describe("hashScenario", () => {
  it("returns a 64-character hex sha256 digest", () => {
    const hash = hashScenario('{"name":"test"}');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic: the same input always hashes the same", () => {
    expect(hashScenario('{"a":1}')).toBe(hashScenario('{"a":1}'));
  });

  it("different input hashes differently", () => {
    expect(hashScenario('{"a":1}')).not.toBe(hashScenario('{"a":2}'));
  });
});
