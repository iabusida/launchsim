# launchsim-indexer

An [Envio HyperIndex](https://docs.envio.dev) project that indexes `ReportRegistry.ReportRecorded` on Monad testnet, so `@launchsim/share`'s `/reports` route can list every crash-test report ever recorded without a caller needing to already know its hash (docs/12 §3a).

This is a standalone project, deliberately **outside** the repo's pnpm workspace (`../pnpm-workspace.yaml` only covers `packages/*`) -- same pattern as `../contracts/`, which is its own independent Foundry project. It has its own `package.json`, `pnpm-workspace.yaml` (for build-script approval only), and lockfile-free install.

## What's here

- `config.yaml` -- points at `ReportRegistry` on Monad testnet (chain 10143), from its deployment block. No `rpc:` override: Monad testnet is natively [HyperSync](https://docs.envio.dev/docs/HyperSync/overview)-supported, so this reads from HyperSync, not a JSON-RPC polling loop.
- `schema.graphql` -- one entity, `Report`, mirroring the event's fields.
- `abis/ReportRegistry.json` -- copied from `../contracts/out/ReportRegistry.sol/ReportRegistry.json`'s `abi` field. Re-copy it if the contract's interface ever changes.
- `src/EventHandlers.ts` -- the one handler: on `ReportRecorded`, upserts a `Report` entity.
- `src/EventHandlers.test.ts` -- exercises the handler with Envio's `createTestIndexer` (synthetic event, no network), asserting field values rather than only a snapshot (docs/08's "no snapshot-only tests for logic" rule).

## Running it

1. **Get a free Envio API token.** Local indexing (via HyperSync) and `envio dev`/`start` need one -- create it yourself at [envio.dev/app/api-tokens](https://envio.dev/app/api-tokens); this project never creates that account or holds that token for you.
2. **Install Docker Desktop or [Podman](https://podman.io/)** -- `envio dev` runs Postgres and Hasura locally in containers.
3. Install dependencies (standalone, not part of the root `pnpm install`):
   ```bash
   cd indexer
   pnpm install --ignore-workspace
   ```
4. Run it:
   ```bash
   ENVIO_API_TOKEN=<your token> pnpm dev
   ```
   This runs codegen, starts the local Postgres/Hasura stack, and begins indexing from the contract's deployment block. The GraphQL API is served locally (Hasura's default is `http://localhost:8080/v1/graphql`; `envio dev`'s own output prints the exact URL and a Hasura console link).
5. Point `share` at it:
   ```bash
   LAUNCHSIM_INDEXER_URL=http://localhost:8080/v1/graphql pnpm --filter @launchsim/share exec node dist/bin.js
   ```
   Then visit `/reports` on the share page.

## Development loop

- `pnpm codegen` -- regenerate `.envio/types.d.ts` from `config.yaml` + `schema.graphql` + the ABI. No API token needed; this step never touches the network.
- `pnpm typecheck` -- `tsc --noEmit` against the generated types.
- `pnpm test` -- `EventHandlers.test.ts` via `createTestIndexer`, fully offline.
- `pnpm dev` -- the real thing, needs `ENVIO_API_TOKEN` and Docker/Podman.

## Deploying

Live on [Envio Cloud](https://docs.envio.dev/docs/HyperIndex/hosted-service) (free/development plan) at `https://indexer.dev.hyperindex.xyz/81a4159/v1/graphql` -- GitHub App connected to `iabusida/launchsim` with root directory `indexer` and config file `config.yaml`, deploying automatically on push to `main`. Synced 100% against Monad testnet at deploy time.

This is a development-plan endpoint, not a pinned production one -- Envio's free tier can delete a deployment after 20GB storage, 30 days of age, or roughly a week of zero requests (with a grace/read-only period first; see [Envio's deployment limits](https://docs.envio.dev/docs/HyperIndex/hosted-service-deployment#development-plan-fair-usage-policy)). "Promote to production" for a static endpoint is a paid-plan feature, not enabled here. If this URL ever stops responding, redeploy from the Envio Cloud dashboard's "Latest Commits" list and update `LAUNCHSIM_INDEXER_URL` if the endpoint changes.
