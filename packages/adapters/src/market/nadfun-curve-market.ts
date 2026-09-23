import type { Market } from "@launchsim/core";
import { createPumpCurveMarket } from "./pump-curve-market.js";

/**
 * The `math/nadfun-curve` adapter's config: virtual reserves, a fee, and a
 * graduation threshold, named after Nad.fun's own `BondingCurve.curves()`
 * fields (`virtualMonReserve`, `virtualTokenReserve`) rather than the
 * generic `virtualQuoteReserve`/`virtualBaseReserve` names `pump-curve`
 * uses -- the values are the caller's responsibility to source (docs/06),
 * ideally a live contract read, not a hardcoded default: Nad.fun's virtual
 * MON reserve has changed three times in the wild (90,000 -> 225,000 ->
 * 180,000 MON as of this adapter's research, 2026-09-23).
 *
 * `graduationQuoteThreshold` is an approximation: Nad.fun's real
 * graduation trigger (`targetTokenAmount` in `curves()`) is a **tokens
 * sold** threshold, not a **quote raised** threshold like `pump-curve`
 * models. Until `core`'s engine supports a token-sold graduation trigger,
 * callers must supply an equivalent quote threshold themselves (e.g. from
 * a live quote at the target token amount) -- this adapter does not
 * convert one to the other, so as not to silently misrepresent it.
 */
export interface NadfunCurveMarketConfig {
  readonly virtualMonReserve: bigint;
  readonly virtualTokenReserve: bigint;
  readonly feeBps: bigint;
  readonly graduationQuoteThreshold: bigint;
}

/**
 * Wraps `math/pump-curve` (docs/06: "if Nad.fun's curve is a
 * virtual-reserve constant product, implement it as a configured instance
 * of the pump-curve math rather than duplicating code" -- confirmed
 * against Nad.fun's `contract-v3-abi` repo, 2026-09-23: `curves()` returns
 * `virtualMonReserve`, `virtualTokenReserve`, `realMonReserve`,
 * `realTokenReserve`, `k`, matching `pump-curve`'s shape exactly). Only
 * `state().kind` differs from a `pump-curve` market built with the same
 * numbers; the trading, fee, and graduation math are identical.
 *
 * @example
 * ```ts
 * const market = createNadfunCurveMarket({
 *   virtualMonReserve: 180_000_000_000_000_000_000_000n, // cite the source and query date (docs/06)
 *   virtualTokenReserve: 1_073_000_000_000_000n,
 *   feeBps: 100n,
 *   graduationQuoteThreshold: 225_000_000_000_000_000_000_000n,
 * });
 * ```
 */
export function createNadfunCurveMarket(config: NadfunCurveMarketConfig): Market {
  const market = createPumpCurveMarket({
    virtualQuoteReserve: config.virtualMonReserve,
    virtualBaseReserve: config.virtualTokenReserve,
    feeBps: config.feeBps,
    graduationQuoteThreshold: config.graduationQuoteThreshold,
  });
  return { ...market, kind: "math/nadfun-curve" };
}
