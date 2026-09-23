import type { Rng } from "./engine/rng.js";

/** Which market implementation a `Market` wraps (docs/01). */
export type MarketKind = "math/pump-curve" | "math/cpmm" | "math/nadfun-curve";

/** A market's current reserves and accrued fees, read-only. */
export interface MarketState {
  readonly quoteReserve: bigint;
  readonly baseReserve: bigint;
  readonly quoteFeesCollected: bigint;
}

/** A non-mutating swap quote: what a trade would produce. */
export interface Quote {
  readonly amountOut: bigint;
  readonly feeAmount: bigint;
}

/** An expected market outcome, returned as data rather than thrown (docs/01 error model). */
export type TradeOutcome =
  | { readonly ok: true; readonly amountOut: bigint; readonly feeAmount: bigint }
  | { readonly ok: false; readonly reason: string };

/** An order to buy base with quote. */
export interface BuyOrder {
  readonly quoteIn: bigint;
  readonly minBaseOut: bigint;
}

/** An order to sell base for quote. */
export interface SellOrder {
  readonly baseIn: bigint;
  readonly minQuoteOut: bigint;
}

/**
 * A market the engine can trade against (docs/01). Implementations wrap
 * the pure math in `@launchsim/adapters` behind this stateful interface.
 */
export interface Market {
  readonly kind: MarketKind;
  state(): MarketState;
  quoteBuy(quoteIn: bigint): Quote;
  quoteSell(baseIn: bigint): Quote;
  buy(order: BuyOrder): TradeOutcome;
  sell(order: SellOrder): TradeOutcome;
  burnFromPool(baseAmount: bigint): void;
  withdrawFees(): bigint;
}

/** The v1 actor catalog (docs/03). */
export type ActorGroup = "retail" | "sniper" | "bundler" | "whale" | "panicSeller" | "flipper";

/** A read-only view of the market an actor's `decide` can see. */
export interface MarketView {
  readonly state: MarketState;
  readonly price: { readonly num: bigint; readonly den: bigint };
  readonly peakQuoteReserve: bigint;
}

/** A read-only view of an actor's own wallet. */
export interface WalletView {
  readonly quoteBalance: bigint;
  readonly baseBalance: bigint;
  readonly entryPrice: { readonly num: bigint; readonly den: bigint } | null;
}

/** An actor's decision input for one slot (docs/03). */
export interface ActorContext {
  readonly slot: number;
  readonly market: MarketView;
  readonly wallet: WalletView;
  readonly rng: Rng;
}

/** One order an actor wants to place, with a human-readable reason (docs/03). */
export interface Order {
  readonly actorId: string;
  readonly group: ActorGroup;
  readonly side: "buy" | "sell";
  readonly priorityFee: bigint;
  readonly reason: string;
  readonly buy?: BuyOrder;
  readonly sell?: SellOrder;
}

/**
 * A simulated market participant: a small, deterministic decision function
 * (docs/03). Pure given `ctx`; no hidden globals.
 */
export interface Actor {
  readonly id: string;
  readonly group: ActorGroup;
  decide(ctx: ActorContext): readonly Order[];
}

/** A mechanic's input for one due firing. */
export interface MechanicContext {
  readonly slot: number;
  readonly market: Market;
}

/** A record of one mechanic firing, appended to the ledger (docs/02). */
export interface MechanicEvent {
  readonly slot: number;
  readonly mechanicId: string;
  readonly baseBurned: bigint;
  readonly quoteSpent: bigint;
}

/**
 * A scheduled intervention on the market -- `lpBurn`, `feeBuyback`
 * (docs/02). Runs after orders execute each slot (docs/01).
 */
export interface Mechanic {
  readonly id: string;
  due(slot: number): boolean;
  apply(ctx: MechanicContext): MechanicEvent;
}

/** One executed (or rejected) order, recorded for the report (docs/04). */
export interface TradeRecord {
  readonly slot: number;
  readonly actorId: string;
  readonly group: ActorGroup;
  readonly side: "buy" | "sell";
  readonly quote: bigint;
  readonly base: bigint;
  readonly ok: boolean;
  readonly reason: string | null;
}

/** One state sample in the timeline. */
export interface TimelineSample {
  readonly slot: number;
  readonly quoteReserve: bigint;
  readonly baseReserve: bigint;
}

/** The engine's sampled state history plus its running peak (docs/01). */
export interface Timeline {
  readonly samples: readonly TimelineSample[];
  readonly peakQuoteReserve: bigint;
}

/** A completed engine run's full output, and a check's input (docs/01, docs/04). */
export interface Ledger {
  readonly timeline: Timeline;
  readonly trades: readonly TradeRecord[];
  readonly mechanicEvents: readonly MechanicEvent[];
  readonly wallets: ReadonlyMap<string, WalletView>;
}

/** The v1 check catalog's result shape (docs/04). */
export interface CheckResult {
  readonly id: string;
  readonly kind: string;
  readonly passed: boolean;
  readonly summary: string;
  readonly observed: string;
  readonly threshold: string;
  readonly atSlot: number | null;
}

/**
 * Reads the finished timeline and ledger and returns a result (docs/01,
 * docs/04). Checks never influence the simulation.
 */
export interface Check {
  readonly id: string;
  evaluate(ledger: Ledger): CheckResult;
}
