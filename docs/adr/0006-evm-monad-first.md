# ADR 0006 — Target Monad

- **Status:** Accepted
- **Date:** 2026-09-22

## Context

The founder's strongest stack is EVM (prior ERC-20 launches, including the hourly LP-burn token). The Monad Metropolis hackathon (EVM, submission Oct 13, 2026, $30K per track + $25K grand champion + residency) is a strong near-term goal. Monad has a native pump-style launchpad, Nad.fun, with visible bundler activity.

## Decision

- Target **Monad**. First chain-specific adapter: a **Nad.fun-style curve** (math mode), parameters taken from Nad.fun's public docs/contracts and cited in the scenario file.
- Chain mode uses **Anvil** forking a Monad RPC.
- The shareable artifact is a **share page + on-chain `ReportRegistry`** (ADR 0007).
- The engine stays chain-agnostic ("quote" asset, not any one chain's native token name).

## Consequences

- Faster execution in the founder's native stack; the hourly burn is native on EVM (burn from pair + `sync()`).
- More existing EVM testing tools (Foundry fuzz/invariant, Tenderly) — differentiation must stay on adversarial launch simulation and the public report.
