# ADR 0007 — Immutable on-chain ReportRegistry on Monad

- **Status:** Accepted
- **Date:** 2026-09-22

## Context

A crash-test report is only useful as a public signal if readers can trust it wasn't edited after the fact or fabricated. The hackathon's Trust/Identity & AI Infrastructure track rewards verifiable trust primitives, and judges expect a working product on Monad.

## Decision

Deploy a minimal `ReportRegistry` contract on Monad that records, per report: the SHA-256 digest of the canonical `RunResult` JSON, the scenario hash, checks passed / total, tool version, a URI, the submitter, and the block timestamp. Records are write-once. No admin, no upgradeability, no fees, no token handling. A share page recomputes the report's hash in the browser and compares it with the chain.

## Consequences

- Anyone can confirm a report is unchanged since it was recorded and who recorded it.
- Recording proves **integrity and authorship**, not that the simulation was honest or the token is safe. The UI must say exactly that.
- Anyone can record anything; spam is possible but harmless because records are keyed by content hash and attributed to the submitter. Filtering by trusted submitters is a UI concern for later.
- Tiny attack surface: no funds, no privileged roles.

## Alternatives considered

- **No on-chain component:** simpler, but weaker trust story and no Monad usage.
- **EAS-style attestation service:** reuse existing infra; revisit if one is deployed and well-supported on Monad.
- **Store full report on-chain:** expensive and unnecessary; the hash is enough.
