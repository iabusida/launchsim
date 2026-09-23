import { z } from "zod";
import {
  AmountStringSchema,
  DurationStringSchema,
  PercentStringSchema,
} from "./unit-strings.schema.js";

/**
 * `lpBurn`: burns a stepped schedule of the pool's base reserve every
 * `stepEvery`, without adding quote -- the draining mechanic (docs/02).
 */
const LpBurnMechanicConfigSchema = z.strictObject({
  kind: z.literal("lpBurn"),
  perHour: z.array(PercentStringSchema).min(1),
  stepEvery: DurationStringSchema.default("24h"),
});

/**
 * `feeBuyback`: spends a share of accrued fees buying and burning base
 * every `interval` -- the fee-funded fix (docs/02).
 */
const FeeBuybackMechanicConfigSchema = z.strictObject({
  kind: z.literal("feeBuyback"),
  interval: DurationStringSchema.default("1h"),
  feeShareBps: z.number().int().min(0).max(10_000).default(10_000),
  minBuy: AmountStringSchema.optional(),
});

/** The v1 mechanic catalog (docs/02). */
export const MechanicConfigSchema = z.discriminatedUnion("kind", [
  LpBurnMechanicConfigSchema,
  FeeBuybackMechanicConfigSchema,
]);
