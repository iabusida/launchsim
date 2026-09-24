# CLAUDE.md — launchsim

> Working name: **launchsim**. The name is a placeholder and can change.
> One-line pitch: *Crash-test your token launch against snipers, bundlers, and bad tokenomics before real money does.*
>
> **Target chain: Monad (EVM) first** (ADR 0006). Solana and the Blink come later.
> **Hard deadline: Monad Metropolis hackathon submission, Oct 13, 2026** — track: Trust/Identity & AI Infrastructure.

This file is the entry point for any AI coding agent (Claude Code, Cursor, etc.) working in this repo. Read it fully before writing code. The `docs/` folder holds the detail; this file holds the rules.

---

## 1. What we are building

An open-source TypeScript toolkit that:

1. **Simulates** a token launch (bonding curve or AMM pool) with scripted market actors: retail buyers, snipers, bundlers, whales, panic sellers, flippers.
2. **Checks** rules that must hold (e.g. "pool quote reserve never drops below 50% of peak", "snipers hold < 10% of supply after 1 minute").
3. **Reports** the result as a terminal summary, a versioned JSON result, and a shareable HTML page.
4. **Records** each report's hash and verdict in an immutable **`ReportRegistry` contract on Monad**, and a **share page** checks the report against the chain, so nobody can fake or quietly edit a result (ADR 0007).

First demo: the founder's old hourly LP-burn token (drains liquidity) vs. a fee-funded hourly buyback-and-burn (does not), on a **Nad.fun-style curve** (Monad's main launchpad).

Primary users: **launchpad builders** (one integration covers every token on their platform — Nad.fun first), then serious token teams, then meme devs who want a trust badge.

Engine math is chain-agnostic: the quote asset is generic (MON on Monad, SOL on Solana). Code and docs say "quote", not "SOL". **Note:** the engine's core types (`TradeRecord`, `Timeline`, etc.) already use `quote`/`base`; the scenario unit-string parser (`"2 SOL"`) and the report's `formatLamports` still hard-code SOL/lamports and need the M5-Monad rename (see `docs/09` Phase A).

## 2. Read these first (in order)

| Doc | Why |
|---|---|
| `docs/00-overview.md` | Problem, users, scope, non-goals |
| `docs/01-architecture.md` | Packages, data flow, the two engine modes |
| `docs/07-testing-tdd.md` | **Mandatory** TDD workflow and coverage rules |
| `docs/08-coding-standards.md` | TypeScript, money math, errors, docs-as-code |
| `docs/09-roadmap-mvp.md` | What to build now vs. later |

Then, per task: `02-scenario-spec`, `03-actors`, `04-checks-and-report`, `06-market-adapters`, `10-security`, `11-ci-release`, `12-report-registry-and-share`, `13-hackathon-submission`, `glossary`, and the ADRs in `docs/adr/`. (`05-blink-actions` is the deferred Solana path; don't build it now.)

## 3. Golden rules (non-negotiable)

1. **TDD, always.** Red → Green → Refactor. Write a failing test first, commit it or show it failing, then write the minimum code to pass, then refactor. No production code without a test that demanded it.
2. **100% coverage** (lines, branches, functions, statements) on every TypeScript package except chain adapters (integration-tested; see `docs/07`), and **100% line and branch coverage from `forge coverage`** on every Solidity contract in `contracts/`. Coverage is enforced in CI; a drop fails the build. `/* v8 ignore */` is forbidden unless the line carries a comment linking a written justification in the PR.
3. **Mutation testing** on `packages/core`: Stryker score must stay **≥ 85%**. Coverage says a line ran; mutation says a test would notice if it broke.
4. **No floating point for money or reserves.** Lamports, token base units, and prices use `bigint` with the fixed-point rules in `docs/08`. `number` is allowed only for counts, indices, percentages in config, and chart coordinates.
5. **Deterministic.** Same scenario + same seed → byte-identical `RunResult` JSON. No `Math.random()`, no `Date.now()` in `core`. Use the injected `Rng` and simulated `Clock`.
6. **Pure core.** `packages/core` has zero I/O: no network, filesystem, env vars, or console. I/O lives in `cli`, `blink`, and `adapters`.
7. **Never touch mainnet keys in code.** The toolkit never asks for, loads, or stores a private key. Simulation and fork tests use Anvil's generated accounts. Publishing to the registry is done by the human with their own wallet or a Foundry keystore (`cast wallet`), never a key in a file or env var committed anywhere. The share page only reads the chain.
8. **Docs are code.** Any change to a public API, scenario format, check, actor, or report schema updates the matching doc in the same PR. Every exported symbol has TSDoc.
9. **Honest reports.** Every report states what was simulated, what was not, the engine mode, the seed, and the tool version. A report must never imply a token is "safe".
10. **Small, reviewable changes.** One behavior per commit. Conventional Commits (`feat(core): …`, `test(report): …`, `docs: …`).

## 4. Tech stack

- **Runtime:** Node.js 22 LTS, TypeScript 5.x (`strict` plus the extra flags in `docs/08`)
- **Workspace:** pnpm workspaces, one monorepo
- **Tests:** Vitest, `@vitest/coverage-v8`, `fast-check` (property tests), Stryker (mutation)
- **Validation:** `zod` for scenario config and every external input
- **EVM / Monad:** `viem` for chain reads/writes from TypeScript; **Foundry** (forge, cast, anvil) for contracts and fork testing; Slither for static analysis. Verify Monad's current RPC URLs, chain IDs, and any Foundry/Anvil caveats in Monad's developer docs before use.
- **Contracts:** Solidity (pin one compiler version), no upgradeability, no admin, no funds held
- **Share page server:** Hono (small, testable with `app.request()` and no real network)
- **Later (Solana path):** `@solana/kit`, LiteSVM, Surfpool, Solana Actions/Blinks
- **Report:** static HTML with inline SVG charts generated in code (no chart library, no CDN), deterministic output
- **Build:** tsup; **Lint/format:** ESLint (typescript-eslint, strict) + Prettier
- **Versioning:** Changesets; **License:** Apache-2.0

Verify current package versions and APIs before adding a dependency. Pin exact versions.

## 5. Repo layout

```
launchsim/
├── CLAUDE.md
├── README.md
├── docs/                    # all design docs (see §2)
├── packages/
│   ├── core/                # engine: clock, rng, market math, actors, mechanics, checks  (pure)
│   ├── testkit/             # shared builders, fixtures, fake clock (dev-only, not published)
│   ├── adapters/            # market adapters: math models (pump-curve, cpmm, nadfun-curve); anvil fork later
│   ├── report/              # RunResult -> terminal text, JSON, HTML (inline SVG)
│   ├── registry/            # viem client for ReportRegistry: encode record calls, read records (TS)
│   ├── share/               # Hono app: /r/:id share page that checks the report hash on Monad
│   ├── mcp/                 # MCP server: "crash-test this token" for Claude Code/Cursor/any MCP client
│   ├── blink/                # (deferred) Solana Actions endpoint — Solana path only
│   └── cli/                 # `launchsim run`, `launchsim report`, `launchsim publish`, `launchsim serve`
├── contracts/               # Foundry project: ReportRegistry.sol + tests (forge)
├── scenarios/               # ready-made scenarios (hourly-burn-lp.ts, fee-buyback.ts, ...)
└── examples/                # runnable end-to-end examples used in the README and videos
```

`blink/` (as an `export {}` placeholder, the deferred Solana path) and `testkit/` (a devDependency-only fixture package, also not built yet) are the only pieces that don't exist as real code today; every other package in the target layout -- `core`, `adapters`, `report`, `cli`, `mcp`, `registry`, `share`, and `contracts/` (a Foundry project, `ReportRegistry.sol` built and tested, deployable but not yet deployed to a public network) -- is built. Dependency direction is one-way: `cli`/`mcp`/`share` → `report`/`adapters`/`registry` → `core` (`mcp` also depends on `cli` directly, reusing its `runScenario`/`runCommand` rather than a second implementation). `contracts/` is independent; `registry` consumes its ABI from Foundry's build output (a copy in `src/abi.ts`, drift-tested against `contracts/out/`). `core` depends on nothing internal. `testkit` is a devDependency only.

## 6. Commands

```bash
pnpm install
pnpm test               # all unit + property tests, with coverage thresholds
pnpm test:watch         # TDD loop
pnpm test:integration   # chain-backed tests (needs anvil; forks Monad)
pnpm test:mutation      # Stryker on packages/core
pnpm lint && pnpm typecheck
pnpm build
pnpm docs:api           # TypeDoc from TSDoc comments
pnpm launchsim run scenarios/hourly-burn-lp.ts

# contracts/ (cd contracts first)
forge test -vvv
forge coverage --report summary --report lcov   # must be 100% lines + branches
forge fmt --check
slither .
```

## 7. How to do a task

1. Find the task in `docs/09-roadmap-mvp.md` (or the issue). Restate the behavior in one sentence.
2. Read the doc for the area you are touching.
3. Write the **first failing test** that describes the behavior from the outside. Run it; confirm it fails for the right reason.
4. Write the **minimum** code to pass. Run the suite.
5. Refactor with tests green. Remove duplication, improve names.
6. Repeat 3–5 until the behavior is complete, including error paths and edge cases (zero, max, rounding boundaries).
7. Run `pnpm lint && pnpm typecheck && pnpm test`. Coverage must be 100%.
8. Update docs and TSDoc. Add a changeset if a published package changed.
9. Commit with a Conventional Commit message.

## 8. Definition of done

- [ ] Behavior driven by tests written first
- [ ] 100% coverage, no new ignores; mutation score ≥ 85% if `core` changed
- [ ] Property tests for any new math or invariant
- [ ] Deterministic: rerun with same seed gives identical output (there is a test for it)
- [ ] Lint, typecheck, build clean
- [ ] TSDoc on exports; matching `docs/` page updated
- [ ] No secrets, keys, or real wallet addresses committed
- [ ] Changeset added if a published package changed

## 9. Things NOT to do

- Don't add a chart library, UI framework, or CDN script to the report. Inline SVG only.
- Don't use `number` for lamports, token amounts, reserves, or prices.
- Don't mock our own modules inside `core` tests. Use real objects; fakes only at I/O boundaries.
- Don't write snapshot tests as the *only* assertion for logic. Snapshots are for HTML/text output.
- Don't add a "buy" button anywhere — share page or Blink (see `docs/adr/0005-no-buy-button-v1.md`).
- Don't build the web IDE/playground yet. It is a later phase.
- Don't build the Solana Blink before the hackathon submission.
- Don't add admin roles, upgradeability, fees, or token transfers to `ReportRegistry`.
- Don't write "verified" to mean "safe". The share page says a report is **recorded** on Monad and its hash **matches** — nothing about the token's safety.
- Don't claim a launch is "safe", "audited", or "rug-proof" anywhere in code, reports, or docs.

## 10. Current phase

**Monad hackathon build** (`docs/09-roadmap-mvp.md`, `docs/13-hackathon-submission.md`), track Trust/Identity & AI Infrastructure. M0–M4 (engine, markets, actors, mechanics, checks, report) are built on the chain-agnostic plan: lint/typecheck clean, 100% coverage on every TS package (`core`, `testkit`, `adapters`, `report`, `registry`, `share`, `cli`, `mcp`, `blink`), Stryker ≥90% on `core` (threshold 85%). `docs/09` Phase B is now fully done, including a real testnet deployment:

- `ReportRegistry` is **live on Monad testnet** (chain 10143) at [`0x15234E82cD27D56613C3D34679D903eAe2C3CFd1`](https://testnet.monadscan.com/address/0x15234E82cD27D56613C3D34679D903eAe2C3CFd1), source-verified on Sourcify (`exact_match`). Deployed with a disposable throwaway keypair generated for this purpose only, never the project owner's own wallet. `cli run` → `cli publish` → a real `cast send` → `cli verify`, and `launchsim serve`'s `/r/:id` page, are all proven against this live contract, not a fork or a mock.
- Mainnet deployment is not yet done — it needs the project owner's own funded wallet and their own signature; this tool doesn't hold or get handed that key, on testnet or mainnet (golden rule 7).

1. SOL→quote rename, the scenario interpreter, `cli run`, `packages/mcp`, and the AI red-team (items 1–4): `scenarios/hourly-burn-lp.ts` and `fee-buyback.ts` run end to end via `pnpm exec launchsim run <path>`, proving the thesis (burn fails `quoteNeverBelowPctOfPeak`, buyback passes it); the same simulation is reachable by any MCP client via `crash_test_scenario`; `red_team_scenario` scales an actor group's count to find the smallest count that breaks a named check — the AI Infrastructure half of the track is covered, not just the Trust half.
2. `math/nadfun-curve` adapter (item 5): wraps `math/pump-curve` since Nad.fun's real curve is the same virtual-reserve constant-product shape; doesn't yet model the tokens-sold graduation trigger (`core` has no such trigger; documented, not silently approximated).
3. `contracts/ReportRegistry.sol` (item 6): write-once, 22 tests (unit, fuzz, a stateful invariant suite, a deploy-script test), 100% `forge coverage` on `src/`, `slither .` clean (no high/medium findings).
4. `packages/registry` (item 7): viem client (`buildRecordCall` never signs, `readRecord`, `toReportHash`), proven against a real Anvil integration test, not just fakes.
5. `packages/share` (item 8): Hono app serving `/r/:id`, `/r/:id/result.json`, `/badge/:id.png` (real PNG via resvg), with a `getChainRecordPanel` recorded/not-recorded/mismatch panel.
6. `cli publish` / `cli verify` (item 9): `publish` computes the `runId`, prints a ready `cast send` command (never signs), and writes the report where `share` expects it; `verify` reads the chain and prints the same panel wording `share` shows.

Remaining known gaps: `RunResult` has no `groups` field though `docs/04` specifies one; no Changesets tooling; the fluent `scenario()`/`actors.*()` DSL sugar is still deferred; Node 22.12–22.17 may need an explicit `--experimental-strip-types` flag to load `.ts` scenario files (only verified on Node 23 so far); the red-team tool isn't yet called out in the demo/README; mainnet deployment. Submission due **Oct 13, 2026**.

## 11. Git identity (project persona)

Commits for this project go out under the project's GitHub persona, not a personal account. Before the first commit in a fresh clone:

```bash
git config user.name  "<persona>"
git config user.email "<id>+<persona>@users.noreply.github.com"
git log -1 --format='%an <%ae>'   # verify before pushing
```
