# 11 — CI and release

## GitHub Actions jobs

| Job | Trigger | Steps | Blocking |
|---|---|---|---|
| `verify` | every push/PR | install (frozen lockfile) → lint (`--max-warnings 0`) → typecheck → build | yes |
| `test` | every push/PR | `pnpm test` with coverage; upload lcov; fail if any package < 100% | yes |
| `determinism` | every push/PR | run all scenarios twice, diff canonical JSON | yes |
| `e2e` | every push/PR | build CLI, run `examples/`, check exit codes and output files | yes |
| `integration` | PRs touching `adapters/surfpool/**`, nightly | install Surfpool, run `*.int.test.ts` and parity tests | yes when triggered |
| `mutation` | nightly, pre-release | Stryker on `core`; fail below 85% | pre-release only |
| `property-explore` | nightly | fast-check with random seeds, larger `numRuns`; opens an issue with any counterexample | no |
| `security` | every push/PR | gitleaks, `pnpm audit --prod` | yes |

Node version from `.nvmrc` (22). Cache the pnpm store.

### Example: `test` job

```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with: { node-version-file: .nvmrc, cache: pnpm }
    - run: pnpm install --frozen-lockfile
    - run: pnpm test -- --coverage
    - uses: actions/upload-artifact@v4
      with: { name: coverage, path: "packages/*/coverage/lcov.info" }
```

Pin third-party actions to a commit SHA before the first public release.

## Branching

- `main` is always releasable and protected: required checks above, one review (or self-review checklist while solo), linear history.
- Short-lived feature branches; squash merge with a Conventional Commit title.

## Versioning and publishing

- Changesets: every PR that changes a published package adds a changeset.
- Published packages: `@launchsim/core`, `@launchsim/report`, `@launchsim/registry`, `@launchsim/share`, `@launchsim/mcp`, `@launchsim/cli` (bin `launchsim`). `testkit` is private. Adapters ship inside `@launchsim/adapters`.
- Pre-1.0: minor bumps may break APIs; `RunResult.schemaVersion` changes are always called out in the changelog.
- Release workflow on merge of the Changesets "Version Packages" PR: build → test → publish to npm with `--provenance` → GitHub release with changelog → upload TypeDoc site.

## Local pre-commit

`lefthook` (or husky) runs on staged files: Prettier, ESLint, and `vitest related` for touched files. Full suite stays in CI to keep commits fast.

## Persona identity in CI

Release commits and tags are made by the GitHub Actions bot. Human commits use the project persona identity configured per clone (see `CLAUDE.md` §11).
