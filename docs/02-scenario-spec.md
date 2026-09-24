# 02 — Scenario spec

A scenario describes one launch, the actors around it, how long to run, and what must hold. Authors write a TypeScript DSL; the DSL produces a plain `ScenarioConfig` object that is validated with zod. The plain config is the real contract (it can later be loaded from YAML/JSON).

## DSL example

```ts
import { scenario, actors, expect, lpBurn } from "@launchsim/core";

export default scenario(
  "hourly burn from LP",
  ({ token, pool, clock }) => {
    token.launch({
      market: "pump-curve",
      supply: "1_000_000_000",
      mechanics: [lpBurn({ perHour: ["5%", "4%", "3%", "1%"], stepEvery: "24h" })],
    });

    actors.snipers({ count: 5, spend: "2 MON", at: "slot:0" });
    actors.retail({ count: 300, spend: "0.1-1 MON", over: "6h" });
    actors.whale({ spend: "50 MON", sellAt: "3x" });
    actors.panicSellers({ count: 40, triggerDrawdown: "30%" });

    clock.run("48h");

    expect(pool.quote).neverBelow("50% of peak");
    expect(actors.snipers.supplyShare("1m")).below("10%");
  },
  { seed: 42 },
);
```

## `ScenarioConfig` schema (v1)

```ts
interface ScenarioConfig {
  schemaVersion: 1;
  name: string; // 1–120 chars
  seed: number; // uint32; default 42
  duration: DurationString; // "48h", "90m", "1d"
  sampleEvery: DurationString; // timeline sampling, default "1m"
  slotMs: number; // default 400
  token: {
    symbol: string; // default "TEST"
    decimals: number; // default 6
    supply: string; // base units as decimal string -> bigint
  };
  market: PumpCurveConfig | CpmmConfig;
  mechanics: MechanicConfig[];
  actors: ActorConfig[];
  checks: CheckConfig[];
}
```

Parsing rules:

- Amounts like `"2 MON"` convert to wei (`bigint`). Ranges like `"0.1-1 MON"` become `{ min, max }` sampled with the seeded RNG.
- Percentages like `"5%"` become basis points (`500`). All percentage math uses basis points (1 bp = 0.01%).
- Times: `"slot:0"`, `"1m"`, `"6h"`, `"hour:31"` → slots.
- Unknown keys are rejected (zod `.strict()`), so typos fail loudly.

## Mechanics

### `lpBurn` — burn tokens out of the pool (the draining version)

Every hour, burn `rate` of the **base (token) reserve** held by the pool. Quote reserve is unchanged.

- Effect: price = quote / base rises, but **no quote enters the pool**. Liquidity in quote terms does not grow while price rises, so each seller removes quote from a pool that is not being refilled.
- Schedule: `perHour: ["5%","4%","3%","1%"], stepEvery: "24h"` means 5% per hour on day 1, 4% on day 2, 3% on day 3, then 1% per hour after.
- Note: on EVM, this mirrors calling `burn()` directly on the pair contract's held base reserve followed by `sync()` (the founder's original ERC-20 launch did exactly this). Math mode models the economics regardless of the exact on-chain mechanism; the report must state what was and wasn't simulated.

### `feeBuyback` — fee-funded buyback and burn (the fixed version)

Trading fees accrue in quote (MON). Every `interval`, the mechanic withdraws accumulated fees, **buys** tokens from the pool with them, and burns the purchased tokens.

- Effect: quote **enters** the pool, price rises, and liquidity deepens. Bigger volume → bigger next burn.
- Params: `interval` (default `"1h"`), `feeShareBps` (share of fees used, default `10000`), `minBuy` (skip dust).

### Mechanic events

Every mechanic run appends a `MechanicEvent { slot, mechanicId, baseBurned, quoteSpent, priceBefore, priceAfter }` to the ledger and appears as a marker on the report chart.

## Checks (config form)

```ts
{ kind: "quoteNeverBelowPctOfPeak", bps: 5000 }
{ kind: "groupSupplyShareBelow", group: "sniper", at: "1m", bps: 1000 }
{ kind: "maxDrawdownBelow", bps: 8000, window: "1h" }
```

Full catalog in `docs/04-checks-and-report.md`.

## Determinism contract

`run(config)` with the same `config` (including `seed`) and the same launchsim version returns a `RunResult` whose canonical JSON is byte-identical. There is a test in `core` that runs every scenario in `scenarios/` twice and diffs the output.

## Shipped scenarios (v1)

| File                          | Purpose                                 | Expected                 |
| ----------------------------- | --------------------------------------- | ------------------------ |
| `scenarios/hourly-burn-lp.ts` | Founder's original mechanic             | Fails liquidity check    |
| `scenarios/fee-buyback.ts`    | Same launch, fee-funded buyback         | Passes liquidity check   |
| `scenarios/sniper-block0.ts`  | Plain pump curve with 5 block-0 snipers | Fails sniper-share check |
| `scenarios/baseline.ts`       | No attackers, retail only               | Passes all (sanity)      |
