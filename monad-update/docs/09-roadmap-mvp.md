# 09 — Roadmap and MVP (Monad hackathon)

Goal: by **Oct 13, 2026**, one command shows the hourly LP burn draining a Nad.fun-style pool and the fee-funded buyback holding it; both reports are recorded on Monad and viewable on a share page that checks them against the chain. Then real launchpad feedback.

With AI-assisted coding, **writing code is not the bottleneck**. The plan budgets most calendar time for what AI can't compress: reviewing and verifying the work, getting real parameters, deploying, getting feedback from launchpad teams, and the demo.

## Status

| Milestone | Scope | Status |
|---|---|---|
| M0 | Repo foundation, CI, coverage gates | done |
| M1 | Money math, CPMM, pump curve, scenario schema | done |
| M2 | RNG, clock, engine loop, actors | overnight run |
| M3 | Mechanics (LP burn, fee buyback), checks, scenarios | overnight run |
| M4 | RunResult, terminal output, HTML report | overnight run |
| ~~M5~~ | ~~Solana Blink~~ | deferred (Solana path) |

## Phase A — Verify what exists (day 1)

- [ ] Human review of M0–M4: tests pass, 100% coverage, no `v8 ignore`, determinism test passes
- [ ] Property tests exist for pool-favoring rounding and `k` never decreasing
- [ ] Run `hourly-burn-lp` and `fee-buyback` by hand; results make economic sense
- [ ] Rename SOL-specific identifiers to generic "quote" (ADR 0006), tests stay green

## Phase B — M5-Monad build (days 1–3 of coding)

- [ ] `math/nadfun-curve` adapter; parameters from Nad.fun's public docs/contracts, cited in the scenario file
- [ ] Re-point shipped scenarios at the Nad.fun-style curve; re-pin expected outcomes
- [ ] `contracts/ReportRegistry.sol` — TDD with forge, 100% `forge coverage`, fuzz + invariant tests, Slither clean
- [ ] `packages/registry` — viem client, ABI drift test, Anvil integration test
- [ ] `packages/share` — `/r/:id` with chain record panel, badge PNG, OG tags
- [ ] `cli publish` / `cli verify`
- [ ] Deploy registry to Monad testnet → then mainnet; verify source on explorer

## Phase C — Real-world proof (runs in parallel from day 1)

- [ ] Research: 30 min/day on X/Discord/GitHub for sniper/bundle pain on Nad.fun and Monad (see sources list in project notes)
- [ ] DM Nad.fun team and 3–5 other Monad builders: "How do you test your curve and fees against snipers today?"
- [ ] Look at 2–3 real Nad.fun launches on-chain for sniper/bundle patterns to motivate the demo

## Phase D — Stretch (only if A–B are solid)

- [ ] Anvil fork of Monad: run one short scenario against Nad.fun's real contracts; parity check vs. math mode
- [ ] AI red-team: search scenario parameters for the smallest attack that breaks a check
- [ ] Nansen bounty angle: use wallet labels to shape sniper/bundler actor profiles

## Phase E — Submission (last 3–4 days, fixed)

- [ ] Demo video, README GIF, submission text (see `docs/13-hackathon-submission.md`)
- [ ] Two live reports recorded on Monad; share links working
- [ ] Buffer for surprises

## Go / no-go after judging

- **Keep going** if a launchpad team engages or developers ask to run it on their own launches — regardless of placement.
- **Rethink** if the demo gets attention but no builder engagement. Fallback: AI-agent tooling (MCP server) reusing the engine.

## After the hackathon

| Phase | Work |
|---|---|
| v0.2 | Anvil chain mode for Nad.fun; parity tests |
| v0.3 | Replay real launches; fitted actor profiles |
| v0.4 | MCP server so Claude Code/Cursor can run "crash-test this token" |
| v0.5 | Robinhood Chain (Pons) and Base adapters |
| v0.6 | Solana path: pump curve, Surfpool, Blink |
| later | Web playground; launchpad integration webhooks; on-chain modules repo |
