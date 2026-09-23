# @launchsim/core

Pure simulation engine: clock, RNG, the `Market` interface, math models,
actors, mechanics, and checks. See `docs/01-architecture.md`.

Zero I/O: no network, filesystem, env vars, or console. Deterministic given
the same scenario and seed (`docs/08-coding-standards.md`, ADR 0004).

## Install

Within the workspace: `pnpm --filter @launchsim/core <script>`.

## Example

```ts
import { ceilDiv } from "@launchsim/core";

ceilDiv(11n, 5n); // 3n
```

## Docs

`docs/01-architecture.md`, `docs/08-coding-standards.md`, `docs/07-testing-tdd.md`.
