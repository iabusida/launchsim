import { type CpmmState, type CpmmQuote, cpmmQuoteBuy, cpmmQuoteSell } from "./cpmm.js";

/**
 * A pump-style bonding curve's state (docs/00, ADR 0002): tokens trade
 * against virtual reserves that smooth the first trade's price, plus the
 * real reserves actually raised/sold so far. Graduates to a {@link CpmmState}
 * once `realQuoteReserve` reaches `graduationQuoteThreshold`.
 */
export interface PumpCurveState {
  readonly virtualQuoteReserve: bigint;
  readonly virtualBaseReserve: bigint;
  readonly realQuoteReserve: bigint;
  readonly realBaseSold: bigint;
  readonly feeBps: bigint;
  readonly quoteFeesCollected: bigint;
  readonly graduationQuoteThreshold: bigint;
}

/**
 * Creates a {@link PumpCurveState} from virtual reserves, a trading fee, and
 * a graduation threshold.
 *
 * @param virtualQuoteReserve - Virtual quote (lamports) backing the initial price. Must be positive.
 * @param virtualBaseReserve - Virtual base (token base units) backing the initial price. Must be positive.
 * @param feeBps - Trading fee taken from every swap, in basis points. Must be non-negative.
 * @param graduationQuoteThreshold - Real quote raised at which the curve graduates. Must be positive.
 */
export function createPumpCurve(
  virtualQuoteReserve: bigint,
  virtualBaseReserve: bigint,
  feeBps: bigint,
  graduationQuoteThreshold: bigint,
): PumpCurveState {
  if (virtualQuoteReserve <= 0n) {
    throw new RangeError("createPumpCurve: virtualQuoteReserve must be positive");
  }
  if (virtualBaseReserve <= 0n) {
    throw new RangeError("createPumpCurve: virtualBaseReserve must be positive");
  }
  if (feeBps < 0n) {
    throw new RangeError("createPumpCurve: feeBps must be non-negative");
  }
  if (graduationQuoteThreshold <= 0n) {
    throw new RangeError("createPumpCurve: graduationQuoteThreshold must be positive");
  }
  return {
    virtualQuoteReserve,
    virtualBaseReserve,
    realQuoteReserve: 0n,
    realBaseSold: 0n,
    feeBps,
    quoteFeesCollected: 0n,
    graduationQuoteThreshold,
  };
}

/**
 * The curve's effective reserves (virtual + real), expressed as a
 * {@link CpmmState} so the constant-product swap math in `cpmm.ts` can be
 * reused verbatim rather than duplicated. Exported for `pump-curve-trade.ts`.
 */
export function effectiveCpmm(curve: PumpCurveState): CpmmState {
  return {
    quoteReserve: curve.virtualQuoteReserve + curve.realQuoteReserve,
    baseReserve: curve.virtualBaseReserve - curve.realBaseSold,
    feeBps: curve.feeBps,
    quoteFeesCollected: 0n,
  };
}

/**
 * Quotes buying base with `quoteIn` against the curve's effective reserves,
 * without mutating `curve`. See {@link cpmmQuoteBuy} for the underlying math.
 *
 * @throws {RangeError} If `quoteIn` is not positive.
 */
export function pumpCurveQuoteBuy(curve: PumpCurveState, quoteIn: bigint): CpmmQuote {
  return cpmmQuoteBuy(effectiveCpmm(curve), quoteIn);
}

/**
 * Quotes selling `baseIn` against the curve's effective reserves, without
 * mutating `curve`. See {@link cpmmQuoteSell} for the underlying math.
 *
 * @throws {RangeError} If `baseIn` is not positive.
 */
export function pumpCurveQuoteSell(curve: PumpCurveState, baseIn: bigint): CpmmQuote {
  return cpmmQuoteSell(effectiveCpmm(curve), baseIn);
}

/**
 * Whether the curve has raised enough real quote to graduate to a CPMM
 * pool. Derived from `realQuoteReserve`, never stored, so it can never
 * drift out of sync with the reserve it depends on.
 */
export function isPumpCurveGraduated(curve: PumpCurveState): boolean {
  return curve.realQuoteReserve >= curve.graduationQuoteThreshold;
}
