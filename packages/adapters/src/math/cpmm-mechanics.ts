import type { CpmmState } from "./cpmm.js";

/**
 * Burns `baseAmount` straight out of the pool's base reserve, leaving
 * `quoteReserve` untouched. This is the `lpBurn` mechanic's mechanism
 * (docs/02): price rises because base shrinks, but no quote enters the
 * pool, so the pool never actually deepens.
 *
 * @param pool - The pool to burn from.
 * @param baseAmount - The amount of base to burn. Must be positive and
 *   strictly less than `pool.baseReserve` (a pool cannot burn itself empty).
 * @throws {RangeError} If `baseAmount` is not positive or exceeds the reserve.
 */
export function cpmmBurnFromPool(pool: CpmmState, baseAmount: bigint): CpmmState {
  if (baseAmount <= 0n) {
    throw new RangeError("cpmmBurnFromPool: baseAmount must be positive");
  }
  if (baseAmount >= pool.baseReserve) {
    throw new RangeError("cpmmBurnFromPool: baseAmount exceeds the pool's base reserve");
  }
  return { ...pool, baseReserve: pool.baseReserve - baseAmount };
}

/** The result of withdrawing accumulated fees: the pool after, and the amount pulled out. */
export interface CpmmFeeWithdrawal {
  readonly state: CpmmState;
  readonly amount: bigint;
}

/**
 * Withdraws all accumulated trading fees, physically pulling them out of
 * `quoteReserve` (they were tracked there but held aside; see docs/02's
 * `feeBuyback` mechanic, which spends this amount to buy and burn base).
 *
 * @param pool - The pool to withdraw fees from.
 */
export function cpmmWithdrawFees(pool: CpmmState): CpmmFeeWithdrawal {
  const amount = pool.quoteFeesCollected;
  return {
    state: { ...pool, quoteReserve: pool.quoteReserve - amount, quoteFeesCollected: 0n },
    amount,
  };
}
