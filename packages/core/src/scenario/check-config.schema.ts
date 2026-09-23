import { z } from "zod";
import { ActorGroupSchema } from "./actor-group.schema.js";
import { DurationStringSchema } from "./unit-strings.schema.js";

const BpsSchema = z.number().int().nonnegative();

/** `quoteNeverBelowPctOfPeak`: pool quote reserve never drops below `bps` of its running peak (docs/04). */
const QuoteNeverBelowPctOfPeakSchema = z.strictObject({
  kind: z.literal("quoteNeverBelowPctOfPeak"),
  bps: BpsSchema,
});

/** `groupSupplyShareBelow`: supply held by `group` at time `at` stays below `bps` of circulating supply (docs/04). */
const GroupSupplyShareBelowSchema = z.strictObject({
  kind: z.literal("groupSupplyShareBelow"),
  group: ActorGroupSchema,
  at: DurationStringSchema,
  bps: BpsSchema,
});

/** `maxDrawdownBelow`: the largest peak-to-trough price drop within any `window` stays below `bps` (docs/04). */
const MaxDrawdownBelowSchema = z.strictObject({
  kind: z.literal("maxDrawdownBelow"),
  bps: BpsSchema,
  window: DurationStringSchema,
});

/** The v1 check catalog (docs/04). */
export const CheckConfigSchema = z.discriminatedUnion("kind", [
  QuoteNeverBelowPctOfPeakSchema,
  GroupSupplyShareBelowSchema,
  MaxDrawdownBelowSchema,
]);
