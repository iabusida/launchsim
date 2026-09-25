# @launchsim/share

The share page (docs/12): `GET /r/:id` (HTML report + chain record panel),
`GET /r/:id/result.json`, `GET /badge/:id.png`. A Hono app, testable with
`app.request()` and no real network.

## Config (`launchsim-serve`)

Read only here and in `cli` (never in `core`/`report`/`registry`):

- `LAUNCHSIM_RPC_URL` (required)
- `LAUNCHSIM_REGISTRY_ADDRESS` (required)
- `LAUNCHSIM_REPORTS_DIR` (default `./launchsim-report`)
- `LAUNCHSIM_BASE_URL` (default `http://localhost:3000`)
- `PORT` (default `3000`)

## Docs

`docs/12-report-registry-and-share.md`.
