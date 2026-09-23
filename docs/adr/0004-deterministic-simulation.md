# ADR 0004 — Seeded, discrete-event, fully deterministic engine

- **Status:** Accepted
- **Date:** 2026-09-22

## Context

Reports are shared publicly and should be reproducible by anyone. Tests need pinned outcomes. Randomness is needed for realistic actor behavior.

## Decision

- The engine is a discrete-event simulation in slots with a priority queue and deterministic tie-breaks.
- All randomness comes from a seeded PRNG (e.g. a small, well-tested algorithm like xoshiro128** or PCG32 implemented in `core`) with `fork(id)` to give each actor an independent stream.
- No wall-clock time or `Math.random` anywhere in `core` (lint-enforced).
- `RunResult` is canonical JSON: same config + seed + tool version → byte-identical output.

## Consequences

- Any report can be reproduced from its scenario hash, seed, and version.
- Pinned scenario tests are stable.
- Adding an actor does not perturb other actors' draws.
- The PRNG must be tested for known vectors so it never changes silently across versions.

## Alternatives considered

- **Real-time loop:** non-reproducible and slow.
- **Global shared RNG:** adding one actor would change every other actor's behavior, breaking pinned tests.
