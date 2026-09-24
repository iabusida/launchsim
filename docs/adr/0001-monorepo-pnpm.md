# ADR 0001 — One pnpm monorepo for all TypeScript packages

- **Status:** Accepted
- **Date:** 2026-09-22

## Context

The engine, report, share server, CLI, and adapters are all TypeScript, change together, and ship together. A change to the `RunResult` schema touches the engine, report, and share server at once. On-chain modules (Solidity/Foundry, in `contracts/`) have different tooling, audit needs, and risk, and stay a separate project within the same repo.

## Decision

Keep all TypeScript packages in one pnpm workspace repo. On-chain programs, if built later, go in a separate repo under the same GitHub organization.

## Consequences

- One PR can change a schema and every consumer atomically.
- One place to star, one issue tracker, one CI setup.
- Dependency direction must be enforced by lint (see `docs/01`), since the monorepo makes cross-imports easy.
- On-chain code stays isolated for auditing and stricter review.

## Alternatives considered

- **Polyrepo per package:** version-skew pain, harder to discover, more CI overhead for a solo maintainer.
- **Single package:** simpler at first, but forces CLI and server dependencies onto library users.
