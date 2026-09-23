# 04 — Checks and report

## Checks

A check reads the finished timeline and ledger and returns a result. Checks never influence the simulation.

```ts
interface CheckResult {
  id: string; // e.g. "quote-never-below-50pct-of-peak"
  kind: CheckKind;
  passed: boolean;
  summary: string; // one human line: "pool SOL fell to 18% of peak at hour 31"
  observed: string; // decimal string (bigint/bps serialized)
  threshold: string;
  atSlot: number | null; // where it failed (or null)
}
```

### v1 catalog

| Kind                       | Passes when                                                                    | Params               |
| -------------------------- | ------------------------------------------------------------------------------ | -------------------- |
| `quoteNeverBelowPctOfPeak` | Pool quote reserve never drops below `bps` of its running peak                 | `bps`                |
| `groupSupplyShareBelow`    | Supply held by actor `group` at time `at` is below `bps` of circulating supply | `group`, `at`, `bps` |
| `maxDrawdownBelow`         | Largest peak-to-trough price drop within any `window` is below `bps`           | `bps`, `window`      |

### Later

`graduationReached` (curve fills before `by`), `retailPnlShareAbove` (share of retail wallets not at a loss), `linkedWalletShareBelow`, `feeBurnCoversSellPressure`.

Each check lives in its own file in `packages/core/src/checks/`, with its own test file, and is registered in `checks/index.ts`.

## `RunResult` (schemaVersion 1)

```ts
interface RunResult {
  schemaVersion: 1;
  tool: { name: "launchsim"; version: string };
  scenario: { name: string; hash: string; seed: number }; // hash = sha256 of canonical config JSON
  mode: "math" | "chain";
  market: { kind: string; params: Record<string, string> };
  durationSlots: number;
  timeline: TimelineSample[]; // { slot, price, quoteReserve, baseReserve, supply, holders }
  mechanicEvents: MechanicEvent[];
  trades: TradeRecord[]; // { slot, actorId, group, side, quote, base, ok, reason }
  groups: GroupSummary[]; // per group: spent, received, pnl, supplyShareAtEnd
  checks: CheckResult[];
  passed: boolean; // all checks passed
  simulated: string[]; // what was modeled
  notSimulated: string[]; // explicit limitations
}
```

Serialization rules:

- All `bigint` values serialize as decimal strings.
- Keys are emitted in a fixed order (canonical JSON). No timestamps from the wall clock; the file must be reproducible.
- `schemaVersion` bumps on any breaking change, with a migration note in `CHANGELOG.md`.

## Terminal output

```
✗ hourly burn from LP   (seed 42 · math mode · launchsim 0.1.0)
  ✗ pool SOL fell to 18% of peak at hour 31
  ✗ snipers held 34% of supply after 1 min
  ✓ max 1h drawdown 41% (limit 80%)
  report → ./launchsim-report/index.html
```

Exit code: `0` if all checks passed, `1` if any failed, `2` on invalid scenario or internal error. This makes launchsim usable in CI.

## HTML report

One self-contained `index.html` plus `result.json`. No external scripts, fonts, or CDNs.

Sections, in order:

1. **Header:** scenario name, pass/fail badge, seed, mode, tool version, scenario hash.
2. **Checks:** each with ✓/✗ and its summary line.
3. **Charts (inline SVG):** price over time; pool quote reserve with a peak line; supply share by group (stacked). Mechanic events as vertical markers.
4. **Who profited:** table of groups with spent, received, PnL.
5. **What was simulated / what was not:** from `simulated` and `notSimulated`. **Always present.**
6. **Reproduce:** the exact command and scenario hash.
7. **Footer disclaimer:** "This report shows how one mechanism behaved against specific simulated behaviors. It is not an audit, not a guarantee, and not financial advice."

### Chart generation

- Pure function `renderLineChart(series, opts): string` returning SVG markup. Deterministic: coordinates rounded to 2 decimals.
- Colors come from CSS custom properties so the page works in light and dark mode.
- Downsample the timeline to at most ~600 points per chart (largest-triangle-three-buckets or min/max bucketing), tested.

### Testing the report

- Unit tests for formatting helpers (lamports → "12.34 SOL", bps → "34%").
- Unit tests for chart scaling and downsampling edge cases (flat series, single point, zero values).
- Golden-file tests: fixed `RunResult` fixture → exact HTML output committed under `__golden__/`. Update intentionally with `pnpm test -u` and review the diff.
- Accessibility test: rendered HTML passes `axe-core` in jsdom with no violations.
