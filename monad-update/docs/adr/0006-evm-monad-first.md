# ADR 0006 — EVM (Monad) first, Solana second

- **Status:** Accepted (supersedes the Solana-first assumption in docs 00, 01, 05, 06)
- **Date:** 2026-09-22

## Context

The original plan targeted Solana because of launch activity there. The founder's strongest stack is EVM (prior ERC-20 launches, including the hourly LP-burn token). The Monad Metropolis hackathon (EVM, submission Oct 13, 2026, $30K per track + $25K grand champion + residency) is a strong near-term goal. Monad has a native pump-style launchpad, Nad.fun, with visible bundler activity.

## Decision

- Target **Monad** first. First chain-specific adapter: a **Nad.fun-style curve** (math mode), parameters taken from Nad.fun's public docs/contracts and cited in the scenario file.
- Chain mode uses **Anvil** forking a Monad RPC instead of Surfpool.
- The shareable artifact is a **share page + on-chain `ReportRegistry`** (ADR 0007) instead of a Solana Blink.
- The engine stays chain-agnostic ("quote" asset, not "SOL"). Solana (pump curve, Surfpool, Blink) remains on the roadmap as the second chain.
- Already-built M0–M4 code is kept; only naming that hard-codes SOL is generalized.

## Consequences

- Faster execution in the founder's native stack; the hourly burn is native on EVM (burn from pair + `sync()`).
- More existing EVM testing tools (Foundry fuzz/invariant, Tenderly) — differentiation must stay on adversarial launch simulation and the public report.
- Loses Blink's built-in unfurl on X until the Solana path is built.

## Alternatives considered

- **Stay Solana-first:** more launch volume, but slower for the founder and a weaker hackathon fit.
- **Robinhood Chain first (Colosseum track):** hot launchpad (Pons), but smaller track prize and splitting effort across two hackathons risks both.
