import { type PumpCurveState, effectiveCpmm } from "./pump-curve.js";

/**
 * Burns `baseAmount` out of the curve's remaining (virtual) supply,
 * leaving `realQuoteReserve` untouched -- the same `lpBurn` mechanism as
 * {@link cpmmBurnFromPool}, applied before graduation (docs/02's demo
 * scenario runs `lpBurn` against a pump-curve market).
 *
 * @param curve - The curve to burn from.
 * @param baseAmount - The amount of base to burn. Must be positive and
 *   strictly less than the curve's current effective base reserve.
 * @throws {RangeError} If `baseAmount` is not positive or exceeds the
 *   effective base reserve.
 */
export function pumpCurveBurnFromPool(curve: PumpCurveState, baseAmount: bigint): PumpCurveState {
  if (baseAmount <= 0n) {
    throw new RangeError("pumpCurveBurnFromPool: baseAmount must be positive");
  }
  const effectiveBase = effectiveCpmm(curve).baseReserve;
  if (baseAmount >= effectiveBase) {
    throw new RangeError("pumpCurveBurnFromPool: baseAmount exceeds the curve's effective base reserve");
  }
  return { ...curve, virtualBaseReserve: curve.virtualBaseReserve - baseAmount };
}

/** The result of withdrawing a curve's accumulated fees: the curve after, and the amount pulled out. */
export interface PumpCurveFeeWithdrawal {
  readonly state: PumpCurveState;
  readonly amount: bigint;
}

/**
 * Withdraws all accumulated trading fees, physically pulling them out of
 * `realQuoteReserve` -- same accounting as {@link cpmmWithdrawFees}:
 * `pumpCurveBuy`/`pumpCurveSell` fold the full traded amount (fee
 * included) into `realQuoteReserve`, so the fee portion is held there,
 * not separately, until withdrawn.
 *
 * @param curve - The curve to withdraw fees from.
 */
export function pumpCurveWithdrawFees(curve: PumpCurveState): PumpCurveFeeWithdrawal {
  const amount = curve.quoteFeesCollected;
  return {
    state: { ...curve, realQuoteReserve: curve.realQuoteReserve - amount, quoteFeesCollected: 0n },
    amount,
  };
}
