# CLAUDE.md — launchsim

> Working name: **launchsim**. The name is a placeholder and can change.
> One-line pitch: *Crash-test your Solana token launch against snipers, bundlers, and bad tokenomics before real money does.*

This file is the entry point for any AI coding agent (Claude Code, Cursor, etc.) working in this repo. Read it fully before writing code. The `docs/` folder holds the detail; this file holds the rules.

---

## 1. What we are building

An open-source TypeScript toolkit that:

1. **Simulates** a token launch (bonding curve or AMM pool) with scripted market actors: retail buyers, snipers, bundlers, whales, panic sellers, flippers.
2. **Checks** rules that must hold (e.g. "pool SOL never drops below 50% of peak", "snipers hold < 10% of supply after 1 minute").
3. **Reports** the result as a terminal summary, a versioned JSON result, and a shareable HTML page.
4. **Publishes** each report as a **Solana Blink** (Solana Actions endpoint), so a launcher can post one link on X and anyone sees the crash-test result.

First demo: the founder's old hourly LP-burn token (drains liquidity) vs. a fee-funded hourly buyback-and-burn (does not).

Primary users: **launchpad builders** (one integration covers every token on their platform), then serious token teams, then meme devs who want a trust badge.

## 2. Read these first (in order)

| Doc | Why |
|---|---|
| `docs/00-overview.md` | Problem, users, scope, non-goals |
| `docs/01-architecture.md` | Packages, data flow, the two engine modes |
| `docs/07-testing-tdd.md` | **Mandatory** TDD workflow and coverage rules |
| `docs/08-coding-standards.md` | TypeScript, money math, errors, docs-as-code |
| `docs/09-roadmap-mvp.md` | What to build now vs. later |

Then, per task: `02-scenario-spec`, `03-actors`, `04-checks-and-report`, `05-blink-actions`, `06-market-adapters`, `10-security`, `11-ci-release`, `glossary`, and the ADRs in `docs/adr/`.

## 3. Golden rules (non-negotiable)

1. **TDD, always.** Red → Green → Refactor. Write a failing test first, commit it or show it failing, then write the minimum code to pass, then refactor. No production code without a test that demanded it.
2. **100% coverage** (lines, branches, functions, statements) on every package except `adapters/surfpool` (integration-tested; see `docs/07`). Coverage is enforced in CI; a drop fails the build. `/* v8 ignore */` is forbidden unless the line carries a comment linking a written justification in the PR.
3. **Mutation testing** on `packages/core`: Stryker score must stay **≥ 85%**. Coverage says a line ran; mutation says a test would notice if it broke.
4. **No floating point for money or reserves.** Lamports, token base units, and prices use `bigint` with the fixed-point rules in `docs/08`. `number` is allowed only for counts, indices, percentages in config, and chart coordinates.
5. **Deterministic.** Same scenario + same seed → byte-identical `RunResult` JSON. No `Math.random()`, no `Date.now()` in `core`. Use the injected `Rng` and simulated `Clock`.
6. **Pure core.** `packages/core` has zero I/O: no network, filesystem, env vars, or console. I/O lives in `cli`, `blink`, and `adapters`.
7. **Never touch mainnet keys.** The toolkit never asks for, loads, or stores a mainnet private key. Local/devnet keypairs are generated per run. The Blink server never signs anything.
8. **Docs are code.** Any change to a public API, scenario format, check, actor, or report schema updates the matching doc in the same PR. Every exported symbol has TSDoc.
9. **Honest reports.** Every report states what was simulated, what was not, the engine mode, the seed, and the tool version. A report must never imply a token is "safe".
10. **Small, reviewable changes.** One behavior per commit. Conventional Commits (`feat(core): …`, `test(report): …`, `docs: …`).

## 4. Tech stack

- **Runtime:** Node.js 22 LTS, TypeScript 5.x (`strict` plus the extra flags in `docs/08`)
- **Workspace:** pnpm workspaces, one monorepo
- **Tests:** Vitest, `@vitest/coverage-v8`, `fast-check` (property tests), Stryker (mutation)
- **Validation:** `zod` for scenario config and every external input
- **Solana:** `@solana/kit`; **LiteSVM** and **Surfpool** for chain-backed mode (Surfpool is Anchor 1.0's default local validator)
- **Blink server:** Hono (small, testable with `app.request()` and no real network)
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
│   ├── adapters/             # market adapters: math models now, surfpool later
│   ├── report/               # RunResult -> terminal text, JSON, HTML (inline SVG)
│   ├── blink/                # Solana Actions endpoint serving reports as Blinks (Hono)
│   └── cli/                  # `launchsim run`, `launchsim report`, `launchsim serve`
├── scenarios/               # ready-made scenarios (hourly-burn-lp.ts, fee-buyback.ts, ...)
└── examples/                # runnable end-to-end examples used in the README and videos
```

Dependency direction is one-way: `cli → blink/report/adapters → core`. `core` depends on nothing internal. `testkit` is a devDependency only.

## 6. Commands

```bash
pnpm install
pnpm test               # all unit + property tests, with coverage thresholds
pnpm test:watch         # TDD loop
pnpm test:integration   # chain-backed tests (needs surfpool installed)
pnpm test:mutation      # Stryker on packages/core
pnpm lint && pnpm typecheck
pnpm build
pnpm docs:api           # TypeDoc from TSDoc comments
pnpm launchsim run scenarios/hourly-burn-lp.ts
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
- Don't add a "buy" button to Blinks in v1 (see `docs/adr/0005-no-buy-button-v1.md`).
- Don't build the web IDE/playground yet. It is a later phase.
- Don't claim a launch is "safe", "audited", or "rug-proof" anywhere in code, reports, or docs.

## 10. Current phase

**MVP two-week spike** (`docs/09-roadmap-mvp.md`): math-mode engine, pump-style curve adapter, six actors, three checks, hourly-burn before/after scenarios, HTML report, and a Blink endpoint. Chain-backed Surfpool mode starts after the spike proves interest.

## 11. Git identity (project persona)

Commits for this project go out under the project's GitHub persona, not a personal account. Before the first commit in a fresh clone:

```bash
git config user.name  "<persona>"
git config user.email "<id>+<persona>@users.noreply.github.com"
git log -1 --format='%an <%ae>'   # verify before pushing
```
