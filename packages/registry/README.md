# @launchsim/registry

A viem client for `ReportRegistry` (docs/12): report hash, build the
`record` call, read records. Never holds or asks for a key -- `cli
publish` prints the encoded call for the human's own wallet or `cast
send`.

## Commands

```bash
pnpm test               # unit tests, fake viem transport, no network
pnpm test:integration    # needs `anvil` on PATH; deploys the real
                          # compiled contract and exercises it for real
```

The ABI in `src/abi.ts` is a copy of `contracts/out/ReportRegistry.sol/ReportRegistry.json`'s
ABI; `abi.drift.test.ts` fails if they diverge.

## Docs

`docs/12-report-registry-and-share.md`.
