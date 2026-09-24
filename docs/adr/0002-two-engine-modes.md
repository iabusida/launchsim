# ADR 0002 — Math mode first, chain mode second, parity tests between them

- **Status:** Accepted
- **Date:** 2026-09-22

## Context

Running every simulated trade as a real transaction on a local chain is the most faithful approach but slow to build and to run, and hard to unit-test. The MVP needs a working before/after demo in two weeks. Foundry's Anvil is mature enough to add chain mode later, forking Monad directly.

## Decision

Build a pure TypeScript **math mode** first behind a `Market` interface. Add a **chain mode** (`ChainMarket` on an Anvil fork of Monad) after the spike. Require **parity tests** that run the same scenario in both modes and compare results within a documented tolerance.

## Consequences

- Fast iteration and 100% unit coverage from day one.
- Math-mode results are only as good as the model; reports must state the mode.
- Parity tests become the trust bridge and must block releases when they fail.
- Real launchpad programs can be tested once chain mode exists, without changing scenarios.

## Alternatives considered

- **Chain mode only:** highest fidelity, but too slow for the spike and for large property-test runs.
- **Math mode only:** fast, but can never test real deployed programs; limits credibility with launchpads.
