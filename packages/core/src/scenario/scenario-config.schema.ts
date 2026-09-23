import { z } from "zod";
import { ActorConfigSchema } from "./actor-config.schema.js";
import { CheckConfigSchema } from "./check-config.schema.js";
import { MarketConfigSchema } from "./market-config.schema.js";
import { MechanicConfigSchema } from "./mechanic-config.schema.js";
import { BaseUnitsStringSchema, DurationStringSchema } from "./unit-strings.schema.js";

const UINT32_MAX = 2 ** 32 - 1;

const TokenConfigSchema = z.strictObject({
  symbol: z.string().min(1).default("TEST"),
  decimals: z.number().int().nonnegative().default(6),
  supply: BaseUnitsStringSchema,
});

/**
 * The full scenario config the DSL produces (docs/02): a launch setup, the
 * actors around it, how long to run, and what must hold. This is the real
 * contract -- it can later be loaded from YAML/JSON as well as the DSL.
 * Unknown keys are rejected at every level (`.strictObject`), so a typo
 * fails loudly instead of being silently ignored.
 */
export const ScenarioConfigSchema = z.strictObject({
  schemaVersion: z.literal(1),
  name: z.string().min(1).max(120),
  seed: z.number().int().nonnegative().max(UINT32_MAX).default(42),
  duration: DurationStringSchema,
  sampleEvery: DurationStringSchema.default("1m"),
  slotMs: z.number().int().positive().default(400),
  token: TokenConfigSchema,
  market: MarketConfigSchema,
  mechanics: z.array(MechanicConfigSchema).default([]),
  actors: z.array(ActorConfigSchema).default([]),
  checks: z.array(CheckConfigSchema).default([]),
});

/** The parsed, defaulted form of a {@link ScenarioConfigSchema}. */
export type ScenarioConfig = z.infer<typeof ScenarioConfigSchema>;
