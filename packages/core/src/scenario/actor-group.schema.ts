import { z } from "zod";

/**
 * The v1 actor catalog (docs/03). Shared by `ActorConfig`'s discriminant
 * and by checks that aggregate by group (`groupSupplyShareBelow`).
 */
export const ActorGroupSchema = z.enum([
  "retail",
  "sniper",
  "bundler",
  "whale",
  "panicSeller",
  "flipper",
]);
