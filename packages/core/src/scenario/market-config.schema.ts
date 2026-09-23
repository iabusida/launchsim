import { z } from "zod";
import {
  AmountStringSchema,
  BaseUnitsStringSchema,
  PercentStringSchema,
} from "./unit-strings.schema.js";

/** `math/pump-curve`: a virtual-reserve bonding curve that graduates to a CPMM pool (docs/06). */
const PumpCurveMarketConfigSchema = z.strictObject({
  kind: z.literal("pump-curve"),
  virtualQuote: AmountStringSchema,
  virtualBase: BaseUnitsStringSchema,
  feeBps: PercentStringSchema,
  graduationQuote: AmountStringSchema,
});

/** `math/cpmm`: a constant-product pool (docs/06). */
const CpmmMarketConfigSchema = z.strictObject({
  kind: z.literal("cpmm"),
  quote: AmountStringSchema,
  base: BaseUnitsStringSchema,
  feeBps: PercentStringSchema,
});

/** The v1 market catalog: `PumpCurveConfig | CpmmConfig` (docs/02, docs/06). */
export const MarketConfigSchema = z.discriminatedUnion("kind", [
  PumpCurveMarketConfigSchema,
  CpmmMarketConfigSchema,
]);
