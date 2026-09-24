# launchsim

[![CI](https://github.com/iabusida/launchsim/actions/workflows/ci.yml/badge.svg)](https://github.com/iabusida/launchsim/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)

**Crash-test a token launch against snipers, bundlers, and bad tokenomics before real money finds out — then record the result on-chain so nobody can fake it.**

Built for the **Monad Metropolis hackathon** (track: Trust/Identity & AI Infrastructure), submission Oct 13, 2026.

---

## The problem

Testing whether smart-contract **code works** is well served — Foundry, Hardhat, fuzzers, formal verification. Testing what happens when **the market attacks a launch** is not. A contract can be bug-free and still fail:

- **Snipers** buy in the first block and dump on retail.
- **Bundlers** use linked wallets to fake a crowd and hold hidden supply.
- **Tokenomics drain.** A real example: the founder's own prior ERC-20 launch burned a shrinking share of the liquidity pool every hour (5% → 4% → 3% → 1%). Price went up on paper every hour, but no new money ever entered the pool — early sellers pulled out at inflated prices, later sellers exited into a pool that kept getting thinner. The contract worked exactly as written. The economics were the bug.

None of that shows up in a unit test. It shows up after real money is lost, and by then it's a postmortem, not a warning.

## What launchsim does

1. **Simulates** the launch inside a scripted adversarial market — retail buyers, snipers, bundlers, a whale, panic sellers — running the actual bonding-curve or AMM math, not a toy model.
2. **Checks** rules that must hold (e.g. "pool liquidity never drops below 50% of its peak").
3. **Reports** the result: a terminal summary, a deterministic JSON `RunResult`, and a shareable HTML page with inline charts.
4. **Records** the report's hash and verdict in an immutable on-chain `ReportRegistry` on Monad. A share page checks the live report against the chain, so a launchpad or token team can post one link and anyone can verify it hasn't been quietly edited after the fact.

## See it work

```ts
// scenarios/hourly-burn-lp.ts — ships in this repo, runs as-is
import type { ScenarioConfigInput } from "@launchsim/core";

const scenario: ScenarioConfigInput = {
  schemaVersion: 1,
  name: "hourly burn from LP",
  seed: 1,
  duration: "48h",
  sampleEvery: "1h",
  token: { symbol: "TEST", supply: "1000000000" },
  market: {
    kind: "nadfun-curve",
    virtualQuote: "30 MON",
    virtualBase: "1073000000000000",
    feeBps: "1%",
    graduationQuote: "1000000 MON",
  },
  mechanics: [{ kind: "lpBurn", perHour: ["5%", "4%", "3%", "1%"], stepEvery: "24h" }],
  actors: [{ group: "retail", count: 300, spend: "0.1-1 MON", over: "6h" }],
  checks: [{ kind: "quoteNeverBelowPctOfPeak", bps: 5000 }],
};

export default scenario;
```

```
$ pnpm exec launchsim run scenarios/hourly-burn-lp.ts
✗ hourly burn from LP   (seed 1 · math mode · launchsim 0.1.0)
  ✗ pool quote fell to 48% of peak at slot 306000
  report → launchsim-report/index.html
```

`scenarios/fee-buyback.ts` runs the **exact same 300 retail actors** against a fee-funded buyback-and-burn mechanic instead of the draining one — and passes the same check. Same actors, same seed, same duration; only the mechanic changes. That contrast is the whole thesis: the mechanic decides the outcome, not luck, and now there's a report proving it either way.

## Quick start

```bash
git clone https://github.com/iabusida/launchsim.git
cd launchsim
pnpm install
pnpm build
pnpm exec launchsim run scenarios/hourly-burn-lp.ts
open launchsim-report/index.html   # or just open the file in a browser
```

Requires Node 22 (`.nvmrc` pins it) and pnpm. `pnpm exec launchsim run scenarios/fee-buyback.ts` runs the passing counterpart.

## The trust layer: prove the report wasn't edited

A report on its own is just a file — anyone could tweak a number after the fact and repost it. launchsim closes that gap with a real on-chain record, not a screenshot:

```
$ export LAUNCHSIM_REGISTRY_ADDRESS=0x15234E82cD27D56613C3D34679D903eAe2C3CFd1
$ launchsim publish launchsim-report --uri https://your-share-host/r/<runId>
runId: e9490ee443dc8eb2
cast send command:
cast send 0x15234E82cD27D56613C3D34679D903eAe2C3CFd1 "record(...)" ... --account <keystore>

$ export LAUNCHSIM_RPC_URL=https://testnet-rpc.monad.xyz
$ launchsim verify e9490ee443dc8eb2
Recorded on Monad
block time ... · submitted by 0x... · 0/1 checks passed · hash matches
```

`launchsim` never asks for, loads, or stores a private key ([golden rule 7](./CLAUDE.md)) — `publish` computes the report's hash and prints the exact transaction for you to sign yourself, with your own wallet or a Foundry keystore. It never signs anything on your behalf.

`ReportRegistry` is a write-once contract: no admin, no upgradeability, no funds held, one function (`record`) that can never overwrite an existing entry. It's live on **Monad testnet** (chain 10143) at [`0x15234E82cD27D56613C3D34679D903eAe2C3CFd1`](https://testnet.monadscan.com/address/0x15234E82cD27D56613C3D34679D903eAe2C3CFd1), source-verified on Sourcify. The share page (`@launchsim/share`) reads the chain live and shows one of three states — **Recorded**, **Not recorded**, or **Mismatch** (if someone tampers with the stored report, it re-hashes to a *different*, unrecorded value, so tampering surfaces honestly as "not recorded," never a false "verified"). Mainnet deployment is pending — that step needs a funded wallet and a human signature, deliberately outside this tool's reach.

## AI Infrastructure: crash-test a launch from an agent

`@launchsim/mcp` exposes the same engine over the [Model Context Protocol](https://modelcontextprotocol.io), so any MCP client — Claude Code, Cursor, or your own agent — can crash-test a launch config directly, no CLI required:

- **`crash_test_scenario`** — runs a scenario, returns the report.
- **`red_team_scenario`** — scales one actor group (snipers, retail, panic sellers) up or down and finds the *smallest* attack that breaks a named check, e.g. "the smallest sniper count that pushes supply concentration over 10% in the first minute." An agent can search for the breaking point instead of a human guessing at parameters.

## Architecture

```
scenario.ts ──► Engine (core) ──► RunResult (deterministic JSON)
                                        │
                          ┌─────────────┼─────────────┐
                          ▼             ▼              ▼
                   terminal text   HTML report   sha256(RunResult)
                                                        │
                                                        ▼
                                    ReportRegistry.record(...) on Monad
                                    (you sign it; launchsim only prints the call)
                                                        │
                                                        ▼
                                share page /r/:id — reads the chain, recomputes the hash
                                "Recorded on Monad · hash matches"
```

| Package | What it does |
|---|---|
| `@launchsim/core` | Pure simulation engine: clock, rng, market math, actors, mechanics, checks. Zero I/O. |
| `@launchsim/adapters` | Market models: `math/pump-curve`, `math/cpmm`, `math/nadfun-curve` (Nad.fun's real curve shape, parameters cited from its public contracts). |
| `@launchsim/report` | `RunResult` → terminal text, JSON, HTML with inline SVG charts (no chart library, no CDN). |
| `@launchsim/registry` | viem client for `ReportRegistry`: builds (never signs) record calls, reads records back. |
| `@launchsim/share` | Hono app serving `/r/:id` (report + live on-chain status) and `/badge/:id.png`. |
| `@launchsim/mcp` | MCP server: `crash_test_scenario`, `red_team_scenario`. |
| `@launchsim/cli` | `launchsim run` / `publish` / `verify`. |
| `contracts/` | `ReportRegistry.sol` (Foundry): write-once, no admin, no upgradeability, no funds held. |

Dependency direction is one-way — `cli`/`mcp`/`share` → `report`/`adapters`/`registry` → `core` — and `core` never touches the network, filesystem, or a clock that isn't injected, which is what makes every run byte-for-byte reproducible from its seed.

## Why this is more than a demo

- **~680 TypeScript tests, 100% line/branch/function coverage, on every package** (`core`, `adapters`, `report`, `registry`, `share`, `cli`, `mcp`) — enforced in CI, not just claimed.
- **Mutation-tested, not just coverage-tested.** [Stryker](https://stryker-mutator.io) mutation score on the core engine is ~99% (threshold 85%, runs nightly in CI) — coverage proves a line *ran*; mutation proves a test would actually *notice* if that line broke.
- **22 Solidity tests** (unit, fuzz, a stateful invariant suite, a deploy-script test) on `ReportRegistry.sol`, 100% line/branch coverage via `forge coverage`, [Slither](https://github.com/crytic/slither) static-analysis clean.
- **Every claim above is checked in CI on every push** — `verify` (lint/typecheck/build), `test` (the full suite with coverage gates), `security` (`pnpm audit`, gitleaks secret scanning) — and `main` is branch-protected: no force-pushes, no deletions, CI must pass.
- **Deployed for real**, not just designed: `ReportRegistry` is live on Monad testnet with a real transaction, real source verification, and the full `run → publish → sign → verify` loop proven end to end against it.

## What it is not

- **Not an audit.** A passing report means the listed scenarios passed, nothing more.
- **Not a trading bot or sniper.** It never sends real transactions on your behalf.
- **Not financial advice.**
- A "Recorded on Monad" badge means the report hasn't been altered since publishing, and who published it — **it says nothing about whether the token is safe.** launchsim never uses the words "safe," "audited," or "rug-proof" about any token, and that's enforced by a test, not just a promise.

## Docs

Start with [`CLAUDE.md`](./CLAUDE.md) for the engineering rules this project holds itself to, then [`docs/`](./docs/README.md) for the full design — in particular [`docs/09-roadmap-mvp.md`](./docs/09-roadmap-mvp.md) for exactly what's built vs. planned, and [`docs/12-report-registry-and-share.md`](./docs/12-report-registry-and-share.md) for how the on-chain recording works end to end.

## License

Apache-2.0
