import { describe, it, expect } from "vitest";
import { comparePriorityFeeDescending } from "./compare-priority-fee.js";
import type { Order } from "../types.js";

function orderWithFee(priorityFee: bigint): Order {
  return { actorId: "a", group: "retail", side: "buy", priorityFee, reason: "test" };
}

describe("comparePriorityFeeDescending", () => {
  it("returns -1 when a has the higher priority fee", () => {
    expect(comparePriorityFeeDescending(orderWithFee(10n), orderWithFee(1n))).toBe(-1);
  });

  it("returns 1 when a has the lower priority fee", () => {
    expect(comparePriorityFeeDescending(orderWithFee(1n), orderWithFee(10n))).toBe(1);
  });

  it("returns 0 when the priority fees are equal", () => {
    expect(comparePriorityFeeDescending(orderWithFee(5n), orderWithFee(5n))).toBe(0);
  });
});
