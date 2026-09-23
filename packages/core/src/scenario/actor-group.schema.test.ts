import { describe, it, expect } from "vitest";
import { ActorGroupSchema } from "./actor-group.schema.js";

describe("ActorGroupSchema", () => {
  it("accepts each documented actor group", () => {
    for (const group of ["retail", "sniper", "bundler", "whale", "panicSeller", "flipper"]) {
      expect(ActorGroupSchema.safeParse(group).success).toBe(true);
    }
  });

  it("rejects an unknown group", () => {
    expect(ActorGroupSchema.safeParse("notAGroup").success).toBe(false);
  });
});
