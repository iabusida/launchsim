import type { Order } from "../types.js";

/**
 * Compares two orders by priority fee, descending (docs/01: "snipers land
 * ahead of retail"). A stable sort using this comparator preserves
 * scheduling order among equal fees, since `Array.prototype.sort` is
 * stable (ES2019).
 */
export function comparePriorityFeeDescending(a: Order, b: Order): number {
  if (a.priorityFee > b.priorityFee) {
    return -1;
  }
  if (a.priorityFee < b.priorityFee) {
    return 1;
  }
  return 0;
}
