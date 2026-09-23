# ADR 0003 — `bigint` fixed-point for all money and reserves

- **Status:** Accepted
- **Date:** 2026-09-22

## Context

Floating-point math silently loses precision on large reserves and tiny trades, and rounding direction matters: real programs round in the pool's favor. A simulator that leaks value through float error would produce misleading reports.

## Decision

All lamports, token base units, reserves, fees, and prices use `bigint`. Percentages are basis points. Prices are rational `{ num, den }` values compared by cross-multiplication. All rounding favors the pool (floor outputs, ceil inputs). Decimal formatting happens only in `report`.

## Consequences

- Exact, reproducible math that mirrors on-chain behavior.
- Slightly more verbose code; helpers (`mulDiv`, `ceilDiv`, `bpsOf`) are mandatory and heavily tested.
- JSON serialization must convert `bigint` to decimal strings.

## Alternatives considered

- **`number` with epsilon comparisons:** simpler, but non-deterministic edge cases and wrong rounding.
- **Decimal library:** adds a dependency and still requires choosing rounding modes everywhere.
