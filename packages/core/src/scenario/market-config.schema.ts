import { z } from "zod";
import {
  AmountStringSchema,
  BaseUnitsStringSchema,
  PercentStringSchema,
} from "./unit-strings.schema.js";

/** `math/pump-curve`: a virtual-reserve bonding curve that graduates to a CPMM pool (docs/06). */
// Stryker disable next-line ObjectLiteral: see stryker.config.mjs's note on static mutants -- replacing this with {} crashes discriminatedUnion construction at module load (reproduced manually).
const PumpCurveMarketConfigSchema = z.strictObject({
  kind: z.literal("pump-curve"),
  virtualQuote: AmountStringSchema,
  virtualBase: BaseUnitsStringSchema,
  feeBps: PercentStringSchema,
  graduationQuote: AmountStringSchema,
});

/** `math/cpmm`: a constant-product pool (docs/06). */
// Stryker disable next-line ObjectLiteral: see stryker.config.mjs's note on static mutants -- replacing this with {} crashes discriminatedUnion construction at module load (reproduced manually).
const CpmmMarketConfigSchema = z.strictObject({
  kind: z.literal("cpmm"),
  quote: AmountStringSchema,
  base: BaseUnitsStringSchema,
  feeBps: PercentStringSchema,
});

/**
 * `math/nadfun-curve`: Nad.fun's bonding curve (docs/06, ADR 0006) --
 * shaped identically to `pump-curve` (a virtual-reserve constant product,
 * confirmed against `BondingCurve.curves()`'s fields in Nad.fun's
 * `contract-v3-abi` repo, 2026-09-23). Its `virtualQuote`/`graduationQuote`
 * are NOT stable constants -- Nad.fun's virtual MON reserve has changed
 * three times in the wild (90,000 -> 225,000 -> 180,000 MON); read them
 * live from the contract rather than trusting a default.
 */
// Stryker disable next-line ObjectLiteral: see stryker.config.mjs's note on static mutants -- replacing this with {} crashes discriminatedUnion construction at module load (reproduced manually).
const NadfunCurveMarketConfigSchema = z.strictObject({
  kind: z.literal("nadfun-curve"),
  virtualQuote: AmountStringSchema,
  virtualBase: BaseUnitsStringSchema,
  feeBps: PercentStringSchema,
  graduationQuote: AmountStringSchema,
});

/** The v1 market catalog: `PumpCurveConfig | CpmmConfig | NadfunCurveConfig` (docs/02, docs/06). */
// Stryker disable next-line StringLiteral: see stryker.config.mjs's note on static mutants -- an empty discriminant key crashes discriminatedUnion construction at module load (reproduced manually).
export const MarketConfigSchema = z.discriminatedUnion("kind", [
  PumpCurveMarketConfigSchema,
  CpmmMarketConfigSchema,
  NadfunCurveMarketConfigSchema,
]);
