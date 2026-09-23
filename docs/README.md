# launchsim docs

| #   | Doc                                             | Covers                                                                 |
| --- | ----------------------------------------------- | ---------------------------------------------------------------------- |
| 00  | [Overview](./00-overview.md)                    | Problem, users, scope, non-goals, success criteria                     |
| 01  | [Architecture](./01-architecture.md)            | Packages, data flow, engine modes, dependency rules                    |
| 02  | [Scenario spec](./02-scenario-spec.md)          | Scenario DSL, config schema, clock, mechanics, the hourly-burn example |
| 03  | [Actors](./03-actors.md)                        | Simulated trader types, parameters, calibration and honesty            |
| 04  | [Checks and report](./04-checks-and-report.md)  | Check catalog, `RunResult` schema, HTML report rules                   |
| 05  | [Blink / Solana Actions](./05-blink-actions.md) | Endpoint design, headers, CORS, `actions.json`, tests                  |
| 06  | [Market adapters](./06-market-adapters.md)      | Market interface, pump curve and CPMM math, Surfpool mode              |
| 07  | [Testing and TDD](./07-testing-tdd.md)          | Mandatory workflow, test pyramid, coverage, mutation                   |
| 08  | [Coding standards](./08-coding-standards.md)    | TypeScript config, bigint money, errors, TSDoc                         |
| 09  | [Roadmap / MVP](./09-roadmap-mvp.md)            | Two-week spike plan, milestones, go/no-go criteria                     |
| 10  | [Security](./10-security.md)                    | Keys, inputs, supply chain, report integrity                           |
| 11  | [CI and release](./11-ci-release.md)            | GitHub Actions jobs, versioning, publishing                            |
| —   | [Glossary](./glossary.md)                       | Terms used across the docs                                             |

## Architecture Decision Records

| ADR                                            | Decision                                                             |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| [0001](./adr/0001-monorepo-pnpm.md)            | One pnpm monorepo for all TypeScript packages                        |
| [0002](./adr/0002-two-engine-modes.md)         | Math mode first, chain-backed mode second, parity tests between them |
| [0003](./adr/0003-bigint-fixed-point.md)       | `bigint` fixed-point for all money and reserves                      |
| [0004](./adr/0004-deterministic-simulation.md) | Seeded, discrete-event, fully deterministic engine                   |
| [0005](./adr/0005-no-buy-button-v1.md)         | No buy button in v1 Blinks                                           |

New decisions get a new ADR (copy `adr/template.md`). ADRs are never edited after acceptance; supersede them with a new one.
