# Security policy

## Scope

launchsim is a simulation and reporting toolkit. It never asks for, reads, or
stores a mainnet private key, and the Blink server never signs or submits
transactions (see `docs/10-security.md`). Security reports in scope include:

- Key or secret exposure in the toolkit, CLI, or Blink server.
- Ways a scenario or report could produce a misleading result (e.g. a check
  that silently passes when it should fail).
- Injection or XSS in the HTML report or Blink endpoint.
- Path traversal, SSRF, or other request-handling bugs in `packages/blink`.
- Supply-chain issues (compromised dependency, broken provenance).

Out of scope: vulnerabilities in third-party Solana programs, launchpads, or
tokens that launchsim merely simulates against.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for a security report.

Report privately via [GitHub Security Advisories](../../security/advisories/new)
on this repository ("Report a vulnerability" under the Security tab).

Include:

- A description of the issue and its impact.
- Steps to reproduce, or a minimal scenario file that demonstrates it.
- The launchsim version or commit affected.

## Response

We aim to acknowledge new reports within **5 business days** and to provide a
fix, mitigation, or timeline within **30 days**. Coordinated disclosure is
preferred; we will credit reporters who want to be credited once a fix ships.
