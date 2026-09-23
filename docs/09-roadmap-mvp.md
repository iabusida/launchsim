# 09 — Roadmap and MVP

## MVP two-week spike

Goal: from one command, show the hourly LP burn draining the pool and the fee-funded buyback not draining it, with a report page and a Blink for each. Then put it in front of launchpad builders.

Every task below is done with TDD (`docs/07`). Each milestone ends with green CI and 100% coverage.

### M0 — Repo foundation (days 1–2)

- [ ] pnpm workspace, `tsconfig.base.json`, ESLint, Prettier, Vitest configs with 100% thresholds
- [ ] Packages scaffolded: `core`, `testkit`, `adapters`, `report`, `blink`, `cli`
- [ ] CI workflow: lint, typecheck, test+coverage (see `docs/11`)
- [ ] Stryker config for `core`
- [ ] First test: `ceilDiv` (red → green)

### M1 — Money math and markets (days 3–4)

- [ ] `core/math`: `ceilDiv`, `mulDiv`, `bpsOf`, `Price`, unit parsing (`"2 SOL"`, `"5%"`, `"6h"`)
- [ ] `math/cpmm`: buy, sell, fees, `burnFromPool`, quotes; invariants as property tests
- [ ] `math/pump-curve`: virtual reserves, graduation to CPMM
- [ ] Zod schema for `ScenarioConfig`

### M2 — Engine, clock, actors (days 5–7)

- [ ] Seeded `Rng` with `fork(id)`; `Clock` in slots; event queue with deterministic tie-breaks
- [ ] Engine loop: decide → order by priority fee → execute → mechanics → sample
- [ ] Actors: `retail`, `sniper`, `whale`, `panicSeller` (M2), `bundler`, `flipper` (M2 stretch)
- [ ] Determinism test across scenarios

### M3 — Mechanics and checks (days 8–9)

- [ ] `lpBurn` with stepped schedule; `feeBuyback`
- [ ] Checks: `quoteNeverBelowPctOfPeak`, `groupSupplyShareBelow`, `maxDrawdownBelow`
- [ ] Scenarios: `hourly-burn-lp`, `fee-buyback`, `sniper-block0`, `baseline`, with pinned outcomes

### M4 — Report (days 10–11)

- [ ] Canonical `RunResult` JSON + scenario hash
- [ ] Terminal renderer + exit codes
- [ ] HTML report with inline SVG charts, "simulated / not simulated" section, golden tests, axe check

### M5 — Blink (days 12–13)

- [ ] Hono app: `actions.json`, GET/OPTIONS action, `/r/:runId`, badge PNG
- [ ] Contract tests against Actions spec schema; CORS and header tests
- [ ] `launchsim serve` command; deploy to a small host (Vercel/Fly/Cloudflare) for the demo

### M6 — Demo and outreach (day 14)

- [ ] README with GIF of the before/after run
- [ ] Publish both reports and Blinks
- [ ] Short video + X thread: "The token mechanic that drained my ERC-20, caught in 30 seconds"
- [ ] DM five smaller Solana launchpad teams: "Want this on every launch on your platform?"

## Go / no-go after the spike

- **Keep going** if at least one launchpad team asks to try it or asks how to integrate, or developers ask to run it on their own token.
- **Rethink** if the demo gets likes but no launchpad replies. Fallback direction: AI-agent tooling (MCP server for Solana), which reuses the engine and has built-in distribution through agent tool directories.

## After the spike (only if "keep going")

| Phase | Work |
|---|---|
| v0.2 | Surfpool chain mode; `surfpool/meteora-dbc` adapter; parity tests |
| v0.3 | Replay real launches; first fitted actor profiles; profile provenance in reports |
| v0.4 | MCP server so Claude Code/Cursor can run "crash-test this token" |
| v0.5 | Launchpad integration kit: webhook to auto-run a scenario pack on each new token and publish its Blink |
| v0.6 | EVM (Base, Robinhood Chain) with the same scenario format |
| later | Web playground (editor + fork + simulation + report in one tab); on-chain modules repo (anti-sniper, fee-funded burn) crash-tested by the engine before each release |

## Grants

Once v0.1 works on real scenarios, apply for Solana ecosystem developer-tooling grants (Superteam, Solana Foundation). Keep a running `docs/grant-notes.md` with usage numbers and demos.
