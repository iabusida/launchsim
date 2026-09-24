# launchsim

**Crash-test your Monad token launch against snipers, bundlers, and bad tokenomics — then record the result on-chain so nobody can fake it.**

> Status: Monad Metropolis hackathon build (track: Trust/Identity & AI Infrastructure), submission Oct 13, 2026. Working name; may change. Solana + Blinks are a deferred path, not current scope.

launchsim runs your launch setup (a bonding curve or an AMM pool, plus mechanics like burns or buybacks) inside a simulated market full of scripted actors — retail, snipers, bundlers, a whale, panic sellers. You get pass/fail checks, a deterministic JSON result, a shareable HTML report, and an immutable on-chain record of that result via a `ReportRegistry` contract on Monad, so a launchpad or a token team can post one link and anyone can verify the report hasn't been quietly edited.

```ts
// scenarios/hourly-burn-lp.ts (shipped, runs as-is)
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

`scenarios/fee-buyback.ts` runs the same actors against a fee-funded buyback-and-burn instead — it passes the same check. That contrast is the whole thesis: the mechanic decides the outcome, not luck.

## Record it on-chain

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

`launchsim` never asks for, loads, or stores a private key (see [`docs/08`](./docs/08-coding-standards.md) golden rule 7) — `publish` prints the transaction for you to sign with your own wallet or a Foundry keystore.

`ReportRegistry` is live on **Monad testnet** (chain 10143) at [`0x15234E82cD27D56613C3D34679D903eAe2C3CFd1`](https://testnet.monadscan.com/address/0x15234E82cD27D56613C3D34679D903eAe2C3CFd1), source-verified on Sourcify. Mainnet deployment is pending.

## AI Infrastructure: use it from an agent

`@launchsim/mcp` exposes the same engine over the Model Context Protocol — `crash_test_scenario` runs a scenario and returns the report; `red_team_scenario` scales an actor group to find the smallest attack that breaks a named check. Any MCP client (Claude Code, Cursor, etc.) can crash-test a launch config directly.

## Packages

| Package | What it does |
|---|---|
| `@launchsim/core` | Pure simulation engine: clock, rng, market math, actors, mechanics, checks. No I/O. |
| `@launchsim/adapters` | Market models: `math/pump-curve`, `math/cpmm`, `math/nadfun-curve`. |
| `@launchsim/report` | `RunResult` → terminal text, JSON, HTML (inline SVG, no chart library). |
| `@launchsim/registry` | viem client for `ReportRegistry`: builds (never signs) record calls, reads records back. |
| `@launchsim/share` | Hono app serving `/r/:id` (report + on-chain status), `/badge/:id.png`. |
| `@launchsim/mcp` | MCP server: `crash_test_scenario`, `red_team_scenario`. |
| `@launchsim/cli` | `launchsim run` / `publish` / `verify`. |
| `contracts/` | `ReportRegistry.sol` (Foundry): write-once, no admin, no upgradeability, no funds held. |

## What it is not

- Not an audit. A passing report means the listed scenarios passed, nothing more.
- Not a trading bot or sniper.
- Not financial advice.
- A "Recorded on Monad" badge means the report hasn't been altered since publishing and who published it — it says nothing about whether the token is safe.

## Docs

Start with [`CLAUDE.md`](./CLAUDE.md), then [`docs/`](./docs/README.md) — in particular `docs/09-roadmap-mvp.md` for current build status and `docs/12-report-registry-and-share.md` for how the on-chain recording works.

## License

Apache-2.0
