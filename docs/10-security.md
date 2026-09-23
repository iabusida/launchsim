# 10 — Security

launchsim touches money-adjacent code and publishes public reports. Security here means: no key exposure, no misleading outputs, no supply-chain surprises.

## Keys and wallets

- The toolkit **never** asks for, reads, or stores a mainnet private key. There is no config option for one.
- Chain mode generates throwaway keypairs per run, funded through local Surfpool/LiteSVM cheatcodes only.
- The Blink server does not sign or submit transactions (v1 has no POST).
- `.gitignore` includes `*.json` keypair patterns under `keys/`, `.env*`; a secret scanner (gitleaks) runs in CI.

## Untrusted inputs

- Scenario files are TypeScript and execute code. **Only run scenarios you trust**, like any test file. The CLI prints this on `run` of a file outside the project. Hosted execution of user-submitted scenarios is out of scope until a sandbox design exists (separate ADR).
- JSON/YAML scenarios (later) are parsed with zod `.strict()` and never evaluated.
- HTTP inputs (`runId`) are validated by pattern before any storage access; path traversal is impossible by construction (IDs are hex only).
- Report HTML escapes every user-provided string (scenario name, token symbol). Golden tests include a scenario named `<script>alert(1)</script>` to prove escaping.

## Report integrity

- `RunResult` includes the scenario hash and tool version; the Blink shows both.
- Reports must never use the words "safe", "audited", "secure", or "rug-proof". A test scans rendered report and Blink text for a deny-list of such claims.
- The "What was not simulated" section is mandatory and non-empty.
- Stored reports are immutable: `runId` is derived from the content hash, so a changed report gets a new ID.

## Supply chain

- Exact version pins; `pnpm-lock.yaml` committed; Renovate or Dependabot with grouped weekly updates.
- New runtime dependencies need a PR note: why, maintenance status, size.
- `pnpm audit --prod` in CI (fail on high/critical).
- npm publishing with provenance from CI only (`docs/11`); maintainers use 2FA.

## Disclosure

`SECURITY.md` at the repo root: how to report a vulnerability privately (GitHub private advisories), expected response time, and scope.
