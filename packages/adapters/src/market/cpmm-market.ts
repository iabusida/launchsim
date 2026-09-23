import type { Market } from "@launchsim/core";
import { createCpmm, cpmmQuoteBuy, cpmmQuoteSell } from "../math/cpmm.js";
import { cpmmBuy, cpmmSell } from "../math/cpmm-trade.js";
import { cpmmBurnFromPool, cpmmWithdrawFees } from "../math/cpmm-mechanics.js";

/** The `math/cpmm` adapter's config: initial reserves and a trading fee. */
export interface CpmmMarketConfig {
  readonly quoteReserve: bigint;
  readonly baseReserve: bigint;
  readonly feeBps: bigint;
}

/**
 * Wraps the pure CPMM math (`math/cpmm.ts`) behind the stateful {@link Market}
 * interface the engine trades against (docs/01, docs/06). Mutation is
 * hidden behind the interface, per docs/08's exception for market implementations.
 *
 * @example
 * ```ts
 * const market = createCpmmMarket({ quoteReserve: 100_000_000_000n, baseReserve: 1_000_000_000_000n, feeBps: 100n });
 * market.buy({ quoteIn: 1_000_000_000n, minBaseOut: 0n });
 * ```
 */
export function createCpmmMarket(config: CpmmMarketConfig): Market {
  let state = createCpmm(config.quoteReserve, config.baseReserve, config.feeBps);
  return {
    kind: "math/cpmm",
    state() {
      return {
        quoteReserve: state.quoteReserve,
        baseReserve: state.baseReserve,
        quoteFeesCollected: state.quoteFeesCollected,
      };
    },
    quoteBuy(quoteIn) {
      return cpmmQuoteBuy(state, quoteIn);
    },
    quoteSell(baseIn) {
      return cpmmQuoteSell(state, baseIn);
    },
    buy(order) {
      const result = cpmmBuy(state, order.quoteIn, order.minBaseOut);
      state = result.state;
      return result.outcome;
    },
    sell(order) {
      const result = cpmmSell(state, order.baseIn, order.minQuoteOut);
      state = result.state;
      return result.outcome;
    },
    burnFromPool(baseAmount) {
      state = cpmmBurnFromPool(state, baseAmount);
    },
    withdrawFees() {
      const withdrawal = cpmmWithdrawFees(state);
      state = withdrawal.state;
      return withdrawal.amount;
    },
  };
}
