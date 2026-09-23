export { ceilDiv } from "./math/ceil-div.js";
export { mulDiv } from "./math/mul-div.js";
export { bpsOf } from "./math/bps-of.js";
export { minBig, maxBig } from "./math/min-max-big.js";
export { price, comparePrice } from "./math/price.js";
export type { Price } from "./math/price.js";
export { parseAmount } from "./math/parse-amount.js";
export { parsePercent } from "./math/parse-percent.js";
export { parseDuration } from "./math/parse-duration.js";

export { ScenarioConfigSchema } from "./scenario/scenario-config.schema.js";
export type { ScenarioConfig } from "./scenario/scenario-config.schema.js";
export { MarketConfigSchema } from "./scenario/market-config.schema.js";
export { MechanicConfigSchema } from "./scenario/mechanic-config.schema.js";
export { ActorConfigSchema } from "./scenario/actor-config.schema.js";
export { CheckConfigSchema } from "./scenario/check-config.schema.js";
export { ActorGroupSchema } from "./scenario/actor-group.schema.js";
export {
  AmountStringSchema,
  AmountRangeStringSchema,
  BaseUnitsStringSchema,
  PercentStringSchema,
  DurationStringSchema,
  SlotOrDurationStringSchema,
} from "./scenario/unit-strings.schema.js";

export type { Rng } from "./engine/rng.js";
export { createRng } from "./engine/rng.js";
export type { Clock } from "./engine/clock.js";
export { createClock } from "./engine/clock.js";
export type { EventQueue, ScheduledEvent } from "./engine/event-queue.js";
export { createEventQueue } from "./engine/event-queue.js";
export { createWallet, applyFill } from "./engine/wallet.js";
export type { Fill } from "./engine/wallet.js";
export { comparePriorityFeeDescending } from "./engine/compare-priority-fee.js";
export { runEngine } from "./engine/engine.js";
export type { EngineConfig, EngineResult, ScheduledActor } from "./engine/engine.js";

export type {
  Actor,
  ActorContext,
  ActorGroup,
  BuyOrder,
  Check,
  CheckResult,
  Ledger,
  Market,
  MarketKind,
  MarketState,
  MarketView,
  Mechanic,
  MechanicContext,
  MechanicEvent,
  Order,
  Quote,
  SellOrder,
  Timeline,
  TimelineSample,
  TradeOutcome,
  TradeRecord,
  WalletView,
} from "./types.js";

export { monitoringSlots } from "./actors/monitoring-slots.js";
export { sampleAmountRange } from "./actors/sample-amount-range.js";
export { hasReachedMultiple, hasDroppedToMultiple } from "./actors/price-target.js";
export { createRetailActors } from "./actors/retail.js";
export type { RetailConfig } from "./actors/retail.js";
export { createSniperActors } from "./actors/sniper.js";
export type { SniperConfig } from "./actors/sniper.js";
export { createWhaleActor } from "./actors/whale.js";
export type { WhaleConfig } from "./actors/whale.js";
export { createPanicSellerActors } from "./actors/panic-seller.js";
export type { PanicSellerConfig, PanicSellerActors } from "./actors/panic-seller.js";

export { createLpBurnMechanic } from "./mechanics/lp-burn.js";
export type { LpBurnMechanicConfig } from "./mechanics/lp-burn.js";
export { createFeeBuybackMechanic } from "./mechanics/fee-buyback.js";
export type { FeeBuybackMechanicConfig } from "./mechanics/fee-buyback.js";

export { createQuoteNeverBelowPctOfPeakCheck } from "./checks/quote-never-below-pct-of-peak.js";
export { createGroupSupplyShareBelowCheck } from "./checks/group-supply-share-below.js";
export { createMaxDrawdownBelowCheck } from "./checks/max-drawdown-below.js";
