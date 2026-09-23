# contracts

`ReportRegistry.sol` (docs/12, ADR 0007): a write-once registry of
crash-test report hashes on Monad. No owner, no pause, no upgrade proxy,
no `payable`, no external calls.

## Setup

```bash
forge install   # fetches lib/forge-std (a git submodule)
```

## Commands

```bash
forge test -vv
forge coverage --report summary   # must be 100% lines + branches for src/
forge fmt --check
slither .                          # no high/medium findings
```

## Deploy

Never with a key committed anywhere (docs/08 golden rule 7, docs/10). The
human runs this with their own wallet or a Foundry keystore:

```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url <Monad RPC URL> \
  --account <keystore name> \
  --broadcast
```

## Docs

`docs/12-report-registry-and-share.md`.
