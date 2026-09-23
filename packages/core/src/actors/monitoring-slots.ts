/**
 * Builds the list of slots an actor should be scheduled at to monitor a
 * position: `start`, then every `step` slots, always including `end` even
 * if it doesn't land on a step boundary.
 *
 * @throws {RangeError} If `end` is before `start` or `step` is not positive.
 */
export function monitoringSlots(start: number, end: number, step: number): number[] {
  if (end < start) {
    throw new RangeError("monitoringSlots: end must be at or after start");
  }
  if (step <= 0) {
    throw new RangeError("monitoringSlots: step must be positive");
  }
  const slots: number[] = [];
  for (let slot = start; slot < end; slot += step) {
    slots.push(slot);
  }
  slots.push(end);
  return slots;
}
