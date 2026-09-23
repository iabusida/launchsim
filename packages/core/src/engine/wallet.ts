import { price } from "../math/price.js";
import type { WalletView } from "../types.js";

/** A filled trade to apply to a {@link WalletView}. */
export interface Fill {
  readonly side: "buy" | "sell";
  readonly quoteAmount: bigint;
  readonly baseAmount: bigint;
}

/**
 * Creates a wallet with `quoteBalance` and no base holdings.
 *
 * @throws {RangeError} If `quoteBalance` is negative.
 */
export function createWallet(quoteBalance: bigint): WalletView {
  if (quoteBalance < 0n) {
    throw new RangeError("createWallet: quoteBalance must be non-negative");
  }
  return { quoteBalance, baseBalance: 0n, entryPrice: null };
}

/**
 * Applies a filled trade to a wallet. A buy sets `entryPrice` from the
 * first purchase only (not averaged across subsequent buys); a sell that
 * empties the base balance clears `entryPrice`. A zero-`baseAmount` buy
 * (a degenerate fill no real market produces, since `cpmmBuy`/`pumpCurveBuy`
 * already reject zero-amount trades -- docs/06) is applied without setting
 * a price, since nothing was actually bought.
 *
 * @throws {RangeError} If the fill would spend more than the wallet holds.
 */
export function applyFill(wallet: WalletView, fill: Fill): WalletView {
  if (fill.side === "buy") {
    if (fill.quoteAmount > wallet.quoteBalance) {
      throw new RangeError("applyFill: insufficient quote balance");
    }
    return {
      quoteBalance: wallet.quoteBalance - fill.quoteAmount,
      baseBalance: wallet.baseBalance + fill.baseAmount,
      entryPrice:
        wallet.entryPrice ?? (fill.baseAmount > 0n ? price(fill.quoteAmount, fill.baseAmount) : null),
    };
  }
  if (fill.baseAmount > wallet.baseBalance) {
    throw new RangeError("applyFill: insufficient base balance");
  }
  const baseBalance = wallet.baseBalance - fill.baseAmount;
  return {
    quoteBalance: wallet.quoteBalance + fill.quoteAmount,
    baseBalance,
    entryPrice: baseBalance === 0n ? null : wallet.entryPrice,
  };
}
