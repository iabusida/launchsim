# 01 — Architecture

## Data flow

```
 scenario.ts ──► ScenarioConfig (zod-validated)
                        │
                        ▼
                 ┌─────────────┐     Market (interface)
                 │   Engine    │◄──── MathMarket   (math mode: pump, cpmm, nadfun)
                 │  (core)     │◄──── ChainMarket  (anvil fork of Monad, later; surfpool for Solana)
                 └─────┬───────┘
      Clock ──► events │ actors decide → orders → market executes → mechanics run
                       ▼
                 Timeline (per-slot state samples + trade log)
                       │
                       ▼
                 Checks ──► CheckResult[]
                       │
                       ▼
                 RunResult (versioned JSON, deterministic)
                  │            │                 │
                  ▼            ▼                 ▼
            terminal text   HTML report     sha256(RunResult)
             (report)        (report)            │
                                                 ▼
                                   ReportRegistry.record(...) on Monad
                                   (human signs with own wallet; cli prints the call)
                                                 │
                                                 ▼
                                   share page /r/:id  ── reads chain, recomputes hash
                                   "Recorded on Monad · hash matches"
```

> Current target is Monad (ADR 0006). The Solana Blink endpoint (`blink`) is the deferred second path.

## Packages

| Package | Responsibility | I/O allowed | Coverage | Status |
|---|---|---|---|---|
| `core` | Clock, RNG, engine loop, `Market` interface, math models, actors, mechanics, checks, `RunResult` builder | **None** | 100% + mutation ≥ 85% | built (M0–M4) |
| `testkit` | Builders (`aScenario()`, `aPool()`), fixtures, fake market | None | n/a (dev-only) | placeholder |
| `adapters` | `MarketAdapter` implementations: `math/pump-curve`, `math/cpmm` now, `math/nadfun-curve` next; `anvil/*` later | Chain RPC (anvil only) | 100% for math; integration for chain adapters | pump-curve + cpmm built |
| `report` | `RunResult` → terminal text, JSON file, HTML with inline SVG | Filesystem via injected writer | 100% | built (M0–M4) |
| `registry` | viem client: report hash, build `record` call, read records | Chain RPC (reads only) | 100% (fake transport) + Anvil integration | not started (M5-Monad) |
| `share` | Hono app: `/r/:id` share page with chain record panel, badge image, OG tags | HTTP, chain reads | 100% | not started (M5-Monad) |
| `contracts/` (Foundry) | `ReportRegistry.sol`, deploy script | on-chain | 100% lines + branches (`forge coverage`) | not started (M5-Monad) |
| `blink` *(deferred)* | Solana Actions endpoint — Solana path only | HTTP | 100% when built | placeholder |
| `cli` | Commands `run` (done), `report`, `serve`, `publish`, `verify`; the `ScenarioConfig → RunResult` interpreter | FS, process, HTTP | 100% (commands tested with injected I/O) | `run` built (2026-09-23): loads a scenario module, writes `launchsim-report/{index.html,result.json}`, sets the exit code |
| `mcp` | MCP server: one tool, `crash_test_scenario`, wrapping `@launchsim/cli`'s `runScenario` (docs/09 Phase B — the AI Infrastructure half of the track) | stdio (MCP transport) | 100% (real client/server integration tests via `InMemoryTransport`) | built (2026-09-23) |

### Dependency rules

- `core` imports nothing internal and no Node built-ins with side effects.
- `report`, `blink`, `adapters` import `core` types and pure helpers only.
- `cli` wires everything together. It is the only place that reads env vars or argv.
- Enforced by ESLint `import/no-restricted-paths` (or `dependency-cruiser`) in CI.

## Engine: discrete-event simulation

- Time unit: **slot** (nominal 400 ms). Durations in config (`"48h"`, `"1m"`) convert to slots.
- The engine keeps a priority queue of events keyed by `(slot, sequence)`. `sequence` breaks ties deterministically.
- Per slot:
  1. Pop all events for the slot.
  2. Ask each scheduled actor for orders (`actor.decide(ctx)`).
  3. Order within a slot: by priority fee (higher first), then by `sequence`. This is how snipers land ahead of retail.
  4. Execute orders against the `Market`; failures (slippage, insufficient funds) are recorded, not thrown.
  5. Run due mechanics (hourly burn, buyback).
  6. Sample state into the timeline at the configured sample interval and on every trade.
- The loop ends at `duration` or when no events remain.

## Two engine modes (ADR 0002)

1. **Math mode (v1).** `MathMarket` implements curve/pool math in pure TypeScript with `bigint`. Fast (48h of trading in well under a second), fully deterministic, trivially unit-testable.
2. **Chain mode (later).** `ChainMarket` sends real transactions to a local Anvil fork of Monad running the actual launchpad contract (Surfpool/LiteSVM for the deferred Solana path). Slower, but tests the real program.

**Parity tests** run the same scenario in both modes and require results within a documented tolerance. Parity is what lets us trust math mode for fast iteration.

## Key interfaces (sketch)

```ts
/** A market the engine can trade against. */
export interface Market {
  readonly kind: MarketKind;
  state(): MarketState;                       // reserves, fees collected
  quoteBuy(quoteIn: bigint): Quote;           // no mutation
  quoteSell(baseIn: bigint): Quote;
  buy(order: BuyOrder): TradeOutcome;         // mutates; returns fill or failure reason
  sell(order: SellOrder): TradeOutcome;
  burnFromPool(baseAmount: bigint): void;     // used by lpBurn mechanic
  withdrawFees(): bigint;                     // used by feeBuyback mechanic
}

export interface Actor {
  readonly id: string;
  readonly group: ActorGroup;                 // "sniper" | "retail" | ...
  decide(ctx: ActorContext): Order[];         // pure given ctx + rng
}

export interface Mechanic {
  readonly id: string;
  due(slot: number): boolean;
  apply(ctx: MechanicContext): MechanicEvent;
}

export interface Check {
  readonly id: string;
  evaluate(ledger: Ledger): CheckResult;      // ledger carries the timeline and trade log
}
```

Full type definitions live in `packages/core/src/types.ts`; this doc is kept in sync. (The `Check` interface above reflects the actual implementation — a single `ledger` argument, not separate `timeline`/`ledger` arguments — since the two drifted apart during M2–M4.)

## Error model

- Programmer errors (invalid config that slipped past zod, impossible state) → throw a subclass of `LaunchsimError` with a stable `code`.
- Expected market failures (slippage exceeded, empty pool, insufficient balance) → returned as `TradeOutcome { ok: false, reason }` and logged in the ledger. They are data, not exceptions.
