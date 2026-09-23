# 09 — Roadmap and MVP (Monad hackathon)

Goal: by **Oct 13, 2026**, one command — or one agent, via the MCP tool — shows the hourly LP burn draining a Nad.fun-style pool and the fee-funded buyback holding it; both reports are recorded on Monad and viewable on a share page that checks them against the chain. Then real launchpad feedback.

With AI-assisted coding, **writing code is not the bottleneck**. The plan budgets most calendar time for what AI can't compress: reviewing and verifying the work, getting real parameters, deploying, getting feedback from launchpad teams, and the demo.

**Track fit note (2026-09-23):** the track is "Trust/Identity **& AI Infrastructure**". The `ReportRegistry` covers Trust; nothing covered AI Infrastructure until now. The MCP tool (`packages/mcp`, exposing "crash-test this token" to Claude Code/Cursor/any MCP client) is pulled forward from the "after the hackathon" table into Phase B, and the AI red-team (an agent searching scenario parameters for the smallest attack that breaks a check) is pulled forward from Phase D stretch into Phase B. Both are now core scope, not stretch.

## Status

| Milestone | Scope | Status |
|---|---|---|
| M0 | Repo foundation, CI, coverage gates | done |
| M1 | Money math, CPMM, pump curve, scenario schema | done |
| M2 | RNG, clock, engine loop, actors | done |
| M3 | Mechanics (LP burn, fee buyback), checks | done |
| M4 | RunResult, terminal output, HTML report | done |
| ~~M5~~ | ~~Solana Blink~~ | deferred (Solana path) |

M0–M4 passed the Phase A review on 2026-09-23: lint/typecheck clean, 100% coverage on `core`/`adapters`/`report`, Stryker 92.74% on `core`. Two real gaps came out of that review, tracked as M5-Monad work below rather than reopening M3/M4: the scenario DSL (`scenario()`, `actors.*()`) and its `ScenarioConfig → EngineConfig` interpreter were never built, so `scenarios/hourly-burn-lp.ts` and `fee-buyback.ts` don't exist as files — only as hard-coded scenario logic inside one capstone test; and `RunResult` has no `groups` field though `docs/04` specifies one.

## Phase A — Verify what exists (day 1) — done 2026-09-23

- [x] Human review of M0–M4: tests pass, 100% coverage, no `v8 ignore`, determinism test passes
- [x] Property tests exist for `k` never decreasing (`cpmm.prop.test.ts`, `pump-curve.prop.test.ts`). Pool-favoring rounding has no single dedicated property test, but is proven by two composed ones: `mulDiv`'s floor property and the CPMM buy-then-sell round-trip property.
- [x] Ran `hourly-burn-lp` and `fee-buyback` by hand (via a reconstruction of the capstone test's scenario, since the files don't exist yet — see above); results make economic sense: the LP burn scenario fails `quoteNeverBelowPctOfPeak` (pool fell to 49% of peak), the fee-buyback scenario passes it.
- [x] Nad.fun research done (2026-09-23): confirmed its `BondingCurve.curves()` is a virtual-reserve constant-product curve — same shape as `math/pump-curve`. The virtual MON reserve has changed three times in the wild (90,000 → 225,000 → 180,000 MON); **do not hardcode it** — read live via `config()`/`curves()` and cite the block queried. Trading fee commonly cited as 1% but is now creator-configurable per token (read `feeConfig()`). Contract addresses found via search need re-verification against the live gitbook/explorer before use.

## Phase B — M5-Monad build (days 1–3 of coding, resequenced 2026-09-23)

Order matters here: the DSL unblocks the scenario files, the MCP tool, and the AI red-team; the SOL→quote rename unblocks the DSL's unit strings; the registry contract has no chain dependency and can be built and TDD'd against Anvil at any point.

1. [x] **SOL→quote rename** (done 2026-09-23). `parseAmount`/`AmountStringSchema`/`AmountRangeStringSchema` accept `MON` (18 decimals) and `SOL` (9, deferred path); `formatLamports` became `formatQuoteAmount(amount, {symbol, decimals})` in `packages/report`, with the unit inferred per-scenario from its own market config (`packages/cli/src/interpreter/quote-unit.ts`), not hard-coded. Found and fixed a real bug along the way: `sample-amount-range.ts`'s range sampling was capped at `Number.MAX_SAFE_INTEGER`, which MON's 18 decimals blow through for any human-sized range — rewrote it as an unbounded bigint mask-and-reject sampler (property-verified unbiased; mutation score 52.5% → 95%).
2. [x] **Scenario interpreter + shipped scenarios** (done 2026-09-23). Scoped down for the hackathon clock: scenarios ship as plain `ScenarioConfig` object literals (docs/02: "the plain config is the real contract"), not the fluent `scenario()`/`actors.snipers()` DSL sugar — that sugar is still deferred. Built `parseAmountRange`, `parseBaseUnitsRange`, `parseSlotOrDuration` (missing math helpers docs/02 assumed existed), a `ScenarioConfig → RunResult` interpreter in `packages/cli/src/interpreter/` (lives in `cli`, not `core`, since it needs `adapters`+`core`+`report` together), and `scenarios/hourly-burn-lp.ts` + `fee-buyback.ts`. Also fixed a real schema bug found while wiring this up: `panicSeller`'s `holdings` was typed as a quote-denominated `AmountRangeStringSchema` ("0.1-1 MON") for a field that's actually base-unit token holdings — added `BaseUnitsRangeStringSchema` and fixed it. `cli run <path>` is done too (2026-09-23): `packages/cli/src/commands/run.ts` (I/O-injected, 100% tested) plus `packages/cli/src/bin.ts` (real fs + dynamic `import()` wiring, the package's `bin` entry) — `pnpm exec launchsim run scenarios/hourly-burn-lp.ts` genuinely runs end to end, writes `launchsim-report/{index.html,result.json}`, and sets the process exit code. Verified manually on Node 23 (type-stripping enabled by default); Node 22.12–22.17 in the pinned `engines` range may need an explicit `--experimental-strip-types` flag until a later 22.x point release — not yet handled or documented for the user.
   - **Calibration finding, worth reading before adding actors back to these two scenarios:** a seed sweep run through the real interpreter showed that adding snipers or a whale to `hourly-burn-lp`/`fee-buyback` makes the `quoteNeverBelowPctOfPeak` check's outcome dominated by that actor's own entry/exit (a "worst dip from peak" check is inherently sensitive to the single largest trade, not the mechanic), rather than the burn-vs-buyback difference — the fee-buyback mechanic passed only ~50-65% of seeds with snipers/whale present, vs. robustly (100% of seeds sampled) with retail only. Ship these two scenarios retail-only; sniper/whale effects belong in a dedicated `sniper-block0.ts`-style scenario, which the docs/02 shipped-scenarios table already anticipates as separate.
3. [x] **`packages/mcp`** (done 2026-09-23). An MCP server (`@modelcontextprotocol/sdk` 1.30.1) with one tool, `crash_test_scenario`, wrapping `@launchsim/cli`'s `runScenario`: an agent (Claude Code, Cursor, any MCP client) passes a `ScenarioConfig` and gets the terminal report back, or a clear `isError` result for an invalid config. Tested with a real client/server pair over `InMemoryTransport` (not just mocks), and smoke-tested as a real subprocess over the actual stdio transport. This is the AI Infrastructure half of the track. Scope for v1: report text only, no file output (that's what `cli run` is for) and no streaming/progress.
4. [x] **AI red-team** (done 2026-09-23). `packages/cli/src/interpreter/red-team.ts`: `findSmallestBreak(config, actorIndex, checkKind, {min,max})` scales one actor group's `count` (retail, sniper, or panicSeller -- the groups with a `count` field) across a range and reports the smallest value that flips the named check from passing to failing. A linear scan, not hill-climbing: scenario runs are fast enough (well under a second) that scanning is simpler and doesn't assume the simulation is monotonic in the parameter, which isn't guaranteed. Surfaced as the `red_team_scenario` MCP tool. **Not yet done:** surfacing this in the demo itself (docs/13's script) -- it exists and is tested, but nothing in the shipped scenarios or README calls it out yet.
5. [x] **`math/nadfun-curve` adapter** (done 2026-09-23). `createNadfunCurveMarket` (`packages/adapters/src/market/nadfun-curve-market.ts`) wraps `math/pump-curve` per docs/06's instruction, since Nad.fun's real `BondingCurve.curves()` is confirmed shaped identically (virtual-reserve constant product). `scenarios/hourly-burn-lp.ts` and `fee-buyback.ts` are re-pointed at `kind: "nadfun-curve"`; the thesis holds identically (verified, both `packages/cli/src/scenarios.test.ts` and a real CLI run) -- expected, since a virtual-reserve curve that never graduates is mathematically identical to a plain CPMM with the same starting reserves. **Known limitation, not fixed:** `graduationQuoteThreshold` approximates Nad.fun's real graduation trigger, which is a *tokens-sold* threshold (`targetTokenAmount`), not the *quote-raised* threshold `pump-curve` models -- `core`'s engine has no tokens-sold graduation trigger yet, so this adapter doesn't attempt the conversion (documented in its TSDoc rather than silently approximated). Reserve figures in the scenario files are illustrative, not live-queried; the Phase A research warns Nad.fun's virtual MON reserve has changed three times in the wild, so citing a fixed number as current would be dishonest -- doing that properly needs a live RPC connection, which is still blocked on you providing one.
6. [x] **`contracts/ReportRegistry.sol`** (done 2026-09-23). Write-once registry per docs/12's interface exactly: `record`/`getRecord`/`isRecorded`, custom errors (`AlreadyRecorded`, `ZeroHash`, `InvalidChecks`, `UriTooLong`, `ToolVersionTooLong`), no owner/pause/upgrade/payable/external calls. 22 tests: unit (happy path + one test per revert path, exact-event assertions via `vm.expectEmit`), 2 fuzz tests (256 runs), a stateful invariant suite with a handler contract (write-once and record-immutability held across ~2,000 handler calls), and a deploy-script test. `forge coverage`: 100% lines/branches/statements/functions on `src/ReportRegistry.sol`. `slither .`: 2 findings, both the same low-severity false positive (an address comparison misattributed to the "timestamp" detector because `record()` also sets `block.timestamp` elsewhere) -- no high/medium findings. Foundry (v1.8.3) and Slither (0.11.4) were not installed; both installed this session (see the environment note below). **Not yet done:** deploying anywhere -- needs an RPC URL, chain ID, and a wallet from you (never held by this tool).
   - **Environment note:** installing Slither via `pip3 install --user slither-analyzer` upgraded several shared Python packages (`web3`, `eth-account`, `eth-utils`, `rlp`, `hexbytes`, others) that an existing, unrelated Python project on this machine (something using `web3-ethereum-defi`, `trie`, `py-evm`, `eth-tester`) depended on at older pinned versions -- pip's resolver printed explicit conflict warnings during install. That other project's environment may now be broken. Not fixed here; flagged for you to check if you use that project.
7. [ ] **`packages/registry`** — viem client, ABI drift test, Anvil integration test.
8. [ ] **`packages/share`** — `/r/:id` with chain record panel, badge PNG, OG tags.
9. [ ] **`cli publish` / `cli verify`**.
10. [ ] **Deploy registry to Monad testnet → then mainnet; verify source on explorer.** Needs an RPC URL, chain ID, and a wallet from the project owner (never a key in this tool) — blocked until provided.

## Phase C — Real-world proof (runs in parallel from day 1)

- [ ] Research: 30 min/day on X/Discord/GitHub for sniper/bundle pain on Nad.fun and Monad (see sources list in project notes)
- [ ] DM Nad.fun team and 3–5 other Monad builders: "How do you test your curve and fees against snipers today?"
- [ ] Look at 2–3 real Nad.fun launches on-chain for sniper/bundle patterns to motivate the demo

This phase has the highest score-per-hour of anything in the plan per `docs/00`'s own go/no-go criteria (a launchpad team engaging matters more than polish) and doesn't block on any of Phase B — start it now, independent of the build.

## Phase D — Stretch (only if A–B are solid)

- [ ] Anvil fork of Monad: run one short scenario against Nad.fun's real contracts; parity check vs. math mode
- [ ] Nansen bounty angle: use wallet labels to shape sniper/bundler actor profiles

(The AI red-team and MCP tool moved to Phase B — see the track-fit note above.)

## Phase E — Submission (last 3–4 days, fixed)

- [ ] Demo video, README GIF, submission text (see `docs/13-hackathon-submission.md`)
- [ ] Two live reports recorded on Monad; share links working
- [ ] Buffer for surprises

## Go / no-go after judging

- **Keep going** if a launchpad team engages or developers ask to run it on their own launches — regardless of placement.
- **Rethink** if the demo gets attention but no builder engagement. Fallback: AI-agent tooling (MCP server) reusing the engine — already pulled into Phase B, not purely a fallback anymore.

## After the hackathon

| Phase | Work |
|---|---|
| v0.2 | Anvil chain mode for Nad.fun; parity tests |
| v0.3 | Replay real launches; fitted actor profiles |
| v0.4 | ~~MCP server~~ done in Phase B; extend with more scenario templates |
| v0.5 | Robinhood Chain (Pons) and Base adapters |
| v0.6 | Solana path: pump curve, Surfpool, Blink |
| later | Web playground; launchpad integration webhooks; on-chain modules repo |
