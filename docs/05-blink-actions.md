# 05 — Blink / Solana Actions

> **Deferred (ADR 0006).** This is the Solana path, planned for after the Monad hackathon. For the current build, see `12-report-registry-and-share.md`. Do not implement this now.

The `blink` package serves each crash-test report as a **Solana Action**, so a link posted on X (or elsewhere) unfurls as a Blink card in clients that support it (Phantom, Solflare browser extensions; others via dial.to-style interstitials).

> Verify against the current Solana Actions spec (`solana.com/docs/tools/actions`) and `@solana/actions` before implementing. Spec details below reflect our understanding at time of writing; tests should assert against the spec, not this doc.

## Why a Blink

The report is the distribution. Every launch that shares its result shows the tool to its own audience. Blinks only render for users with a supporting wallet extension, mostly on desktop, so **every Blink also links to the normal HTML report**.

## Endpoints

| Method    | Path                         | Purpose                                               |
| --------- | ---------------------------- | ----------------------------------------------------- |
| `GET`     | `/actions.json`              | Maps site URLs to action URLs (served at domain root) |
| `GET`     | `/api/actions/report/:runId` | Returns the Action metadata for one report            |
| `OPTIONS` | `/api/actions/report/:runId` | CORS preflight                                        |
| `GET`     | `/r/:runId`                  | Human-readable HTML report page                       |
| `GET`     | `/badge/:runId.png`          | Card image (pass/fail badge + key numbers)            |

v1 has **no POST / no transaction** (see ADR 0005). The Action is informational: its button links to the full report.

## GET response (shape)

```json
{
  "type": "action",
  "icon": "https://<host>/badge/<runId>.png",
  "title": "Crash-test: TEST — 2 of 3 checks failed",
  "description": "5 snipers, 300 retail, 1 whale over 48h. Pool SOL fell to 18% of peak. Simulated, not an audit.",
  "label": "View report",
  "links": {
    "actions": [
      { "type": "external-link", "label": "View full report", "href": "https://<host>/r/<runId>" }
    ]
  }
}
```

If the installed spec version does not support `external-link` actions, fall back to `disabled: true` with the report URL in `description`, and document which spec version we target in `packages/blink/SPEC_VERSION`.

## Required headers

- CORS on every Action response and preflight: `Access-Control-Allow-Origin: *`, allowed methods `GET,POST,PUT,OPTIONS`, allowed headers including `Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Action-Version, X-Blockchain-Ids`, and exposed `X-Action-Version, X-Blockchain-Ids`. Use the helper constant from `@solana/actions` if available rather than hand-copying.
- `X-Action-Version` and `X-Blockchain-Ids` (Solana mainnet CAIP-2 id) on responses.
- `Content-Type: application/json`.

## `actions.json`

```json
{ "rules": [{ "pathPattern": "/r/*", "apiPath": "/api/actions/report/*" }] }
```

## Badge image

- PNG generated from an SVG template (e.g. `@resvg/resvg-js`), 1200×630 or square per current client guidance.
- Shows: token symbol, PASS/FAIL, the worst failing check in one line, "simulated · not an audit".
- Deterministic for a given `RunResult` (golden-file tested by hash).

## Storage

v1: reports stored as `result.json` files keyed by `runId` (= first 16 hex chars of `sha256(canonical RunResult)`). The store is an interface (`ReportStore`) with a filesystem implementation and an in-memory fake for tests. Hosted storage comes later.

## Registration

For Blinks to unfurl on X for all users, the action URL/domain may need to be registered with the Blinks registry (Dialect). Track the current process in `packages/blink/REGISTRY.md`; this is an ops step, not code.

## Tests (all without real network)

- Hono `app.request()` for every route.
- Contract tests: GET response validates against a zod schema mirroring the Actions spec; includes required headers; OPTIONS returns CORS headers.
- Unknown `runId` → 404 JSON error in the Actions error format (`{ "message": "…" }`).
- Malformed `runId` (not 16 hex chars) → 400, never touches storage.
- Title/description truncation at spec limits, tested at the boundary.
- Badge rendering golden test (hash of PNG bytes).
