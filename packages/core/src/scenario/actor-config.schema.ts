import { z } from "zod";
import {
  AmountRangeStringSchema,
  AmountStringSchema,
  BaseUnitsRangeStringSchema,
  DurationStringSchema,
  PercentStringSchema,
  SlotOrDurationStringSchema,
} from "./unit-strings.schema.js";

const PositiveIntSchema = z.number().int().positive();
const BpsSchema = z.number().int().min(0).max(10_000);

/**
 * `retail`: arrive spread over a window, buy once, hold; some sell on
 * profit or loss. Defaults: 30% sell at 2x, 20% sell at -50% (docs/03).
 */
const RetailActorConfigSchema = z.strictObject({
  group: z.literal("retail"),
  count: PositiveIntSchema,
  spend: AmountRangeStringSchema,
  over: DurationStringSchema,
  takeProfitX: z.number().positive().default(2),
  stopLossPct: PercentStringSchema.default("50%"),
  sellProbabilityBps: BpsSchema.default(3000),
});

/**
 * `sniper`: buys in the first slot(s) with a high priority fee; sells
 * after a short hold or at a multiple. Defaults: slot 0, sell at 2x or
 * after 150 slots (~1 min) (docs/03).
 */
const SniperActorConfigSchema = z.strictObject({
  group: z.literal("sniper"),
  count: PositiveIntSchema,
  spend: AmountRangeStringSchema,
  at: SlotOrDurationStringSchema.default("slot:0"),
  priorityFee: AmountStringSchema.optional(),
  holdSlots: z.number().int().nonnegative().default(150),
  sellAtX: z.number().positive().default(2),
});

/**
 * `bundler`: N linked wallets buying in the same slot as creation, funded
 * from one source; sells in tranches. Defaults: 10 wallets, 20% tranches
 * every 10 min (docs/03).
 */
const BundlerActorConfigSchema = z.strictObject({
  group: z.literal("bundler"),
  wallets: PositiveIntSchema.default(10),
  totalSpend: AmountStringSchema,
  trancheBps: BpsSchema.default(2000),
  sellEvery: DurationStringSchema.default("10m"),
});

/**
 * `whale`: one large buy at a set time; sells all at a multiple or on a
 * trigger. Defaults: at 30 min, sell at 3x (docs/03).
 */
const WhaleActorConfigSchema = z.strictObject({
  group: z.literal("whale"),
  spend: AmountStringSchema,
  at: DurationStringSchema.default("30m"),
  sellAtX: z.number().positive().default(3),
});

/**
 * `panicSeller`: holders who sell everything when drawdown from peak
 * exceeds a threshold. Default: 30% drawdown (docs/03). `holdings` is a
 * base-unit (token) range, not a quote amount -- these actors start
 * already holding the launched token, they never buy it.
 */
const PanicSellerActorConfigSchema = z.strictObject({
  group: z.literal("panicSeller"),
  count: PositiveIntSchema,
  holdings: BaseUnitsRangeStringSchema,
  triggerDrawdown: PercentStringSchema.default("30%"),
});

/**
 * `flipper`: repeated small buy/sell cycles chasing short momentum.
 * Defaults: every 5 min, 3-sample momentum (docs/03).
 */
const FlipperActorConfigSchema = z.strictObject({
  group: z.literal("flipper"),
  count: PositiveIntSchema,
  spend: AmountRangeStringSchema,
  cycleEvery: DurationStringSchema.default("5m"),
  momentumWindow: PositiveIntSchema.default(3),
});

/** The v1 actor catalog (docs/03). */
export const ActorConfigSchema = z.discriminatedUnion("group", [
  RetailActorConfigSchema,
  SniperActorConfigSchema,
  BundlerActorConfigSchema,
  WhaleActorConfigSchema,
  PanicSellerActorConfigSchema,
  FlipperActorConfigSchema,
]);
