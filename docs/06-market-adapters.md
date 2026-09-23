# 06 — Market adapters

An adapter builds a `Market` for a given market config and engine mode.

```ts
interface MarketAdapter<C extends MarketConfig = MarketConfig> {
  readonly id: string; // "math/pump-curve"
  readonly mode: "math" | "chain";
  supports(config: MarketConfig): config is C;
  create(config: C, env: AdapterEnv): Promise<Market>;
}
```

## v1: math adapters

### `math/pump-curve` — virtual-reserve bonding curve

Pump-style curves behave like a constant-product pool over **virtual** reserves.

- State: `vQuote`, `vBase` (virtual), `realQuote`, `realBase`, `k = vQuote * vBase`.
- Buy with `dq` quote after fee `f` (bps): `dqNet = dq - fee(dq)`, `baseOut = vBase - ceilDiv(k, vQuote + dqNet)`.
- Sell `db` base: `quoteOutGross = vQuote - ceilDiv(k, vBase + db)`, then subtract fee.
- Graduation: when `realQuote >= graduationQuote`, the curve closes and liquidity migrates to a CPMM pool (`math/cpmm`) with the configured migration parameters.
- Defaults are configurable and must be labeled as approximations of a typical pump-style launch, not any platform's exact parameters. Verify current real-world values before using them in a demo and cite the source in the scenario file.

### `math/cpmm` — constant product pool

- State: `quote`, `base`, `feeBps`, `feesAccrued`.
- Same formulas without virtual reserves. `burnFromPool(b)` reduces `base` without changing `quote` (used by `lpBurn`).

### Rounding rule (critical)

**All rounding favors the pool.** Output amounts round down; required inputs round up (`ceilDiv`). This prevents the simulated pool from leaking value through rounding and mirrors how real programs are written. Property tests enforce it: for any sequence of trades, `quote * base` after fees is `>=` the value before.

### Invariants (property-tested with fast-check)

1. `k` never decreases after a trade (fees only increase it).
2. Conservation: total quote in wallets + pool + fees + burned = initial total; same for base.
3. Buying then immediately selling the received amount never returns more quote than spent.
4. `quoteBuy(x)` and a subsequent `buy(x)` produce the same fill.
5. Zero-amount trades are rejected as `ok: false, reason: "zero-amount"`.

### `math/nadfun-curve` — Monad's main launchpad (current priority, ADR 0006)

- Model Nad.fun's bonding curve and graduation using parameters from its **public docs and verified contracts** (curve type, virtual reserves or equivalent, fees, graduation threshold, destination pool). Read the contract source rather than guessing; cite the source and date in the adapter's TSDoc and in each scenario that uses it.
- If Nad.fun's curve is a virtual-reserve constant product, implement it as a configured instance of the pump-curve math rather than duplicating code.
- Quote asset is MON; units come from config, never hard-coded.
- Tests: same invariant suite as the other math markets, plus golden tests against a handful of hand-computed trades from the contract's formulas.

## Chain mode on Monad: Anvil fork (after the core Monad build)

- `anvil --fork-url <Monad RPC>` gives a local copy of Monad state; Nad.fun's real contracts can be called with Anvil's funded accounts.
- Actors send real transactions via viem; priority ordering within a block is approximated by submission order and gas price (documented in `notSimulated`).
- Check Monad's developer docs for known differences from Ethereum execution (e.g. parallel execution, gas accounting) that affect forking or ordering, and record them in `notSimulated`.
- Tests are `*.int.test.ts`, excluded from the unit gate, run in the `integration` CI job with Foundry installed. Parity tests against `math/nadfun-curve`.

## Later: Solana chain adapters (`surfpool/*`, deferred)

- Start a Surfpool instance (mainnet fork, copy-on-read) or LiteSVM in-process for speed.
- Load the target launchpad program (by program id from mainnet fork, or a local `.so`) and its IDL; generate a typed client with Codama.
- Map `buy`/`sell`/`burnFromPool` to real instructions. Actors get generated keypairs funded via Surfpool cheatcodes.
- Priority ordering within a slot is approximated by submission order; document the gap versus real leader behavior in `notSimulated`.
- Tests: tagged `@integration`, excluded from the unit coverage gate, run in a dedicated CI job with Surfpool installed.

### Parity tests

For each math adapter with a chain counterpart, run the same short scenario in both modes and assert:

- Final reserves equal within 1 base unit per trade (rounding differences).
- Same check verdicts.

Parity failures block releases of either adapter.

## Planned adapters

| Adapter | Mode | Priority |
|---|---|---|
| `math/pump-curve` | math | v1 (done) |
| `math/cpmm` | math | v1 (done) |
| `math/nadfun-curve` | math | **now — Monad hackathon** |
| `anvil/nadfun` | chain | stretch / right after hackathon |
| `math/pons-curve`, `anvil/pons` | math/chain | after hackathon (Robinhood Chain) |
| `surfpool/meteora-dbc` | chain | Solana path (strong fee-scheduler/anti-sniper features to test) |
| `surfpool/raydium-launchlab` | chain | after spike |
| `surfpool/custom-idl` | chain | later (any program with an IDL + mapping file) |
