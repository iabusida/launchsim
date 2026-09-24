# ADR 0005 — No buy button in v1 reports

- **Status:** Accepted
- **Date:** 2026-09-22

## Context

A share page (or badge) could include a transaction button (e.g. "Buy 0.1 MON"). That would boost hype and conversion, but it turns a neutral crash-test report into a promotion tool for the token being tested, creates conflict-of-interest and legal questions, and would require building and securing transaction construction.

## Decision

v1 reports are informational only: a summary card, the chain-record panel, and a link to the full report. No POST endpoint, no transaction.

## Consequences

- The report stays credible as a neutral signal, which is the product's core value.
- Simpler, safer server with no signing or transaction-building code.
- Less "hype" than a buy button; revisit only with a clear neutrality policy (e.g. the button is controlled and labeled by the launcher, not by launchsim) in a new ADR.

## Alternatives considered

- **Buy button on every report:** maximum virality, but undermines neutrality and trust.
- **Buy button only on passing reports:** implies an endorsement, which the product must never make.
