import { type CpmmState, createCpmm } from "./cpmm.js";
import { type PumpCurveState, isPumpCurveGraduated } from "./pump-curve.js";

/**
 * Graduates a curve to a new CPMM pool: the remaining, never-sold base
 * supply and all the real quote raised so far become the new pool's
 * starting reserves. Accumulated `quoteFeesCollected` is left behind
 * (callers withdraw it from the curve before graduating, same as any other
 * mechanic-triggered fee withdrawal).
 *
 * @param curve - A curve that has reached its graduation threshold.
 * @throws {RangeError} If the curve has not graduated yet.
 */
export function pumpCurveGraduate(curve: PumpCurveState): CpmmState {
  if (!isPumpCurveGraduated(curve)) {
    throw new RangeError("pumpCurveGraduate: curve has not reached its graduation threshold");
  }
  return createCpmm(
    curve.realQuoteReserve,
    curve.virtualBaseReserve - curve.realBaseSold,
    curve.feeBps,
  );
}
