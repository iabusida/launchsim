# 12 — Report registry and share page

The Monad build's shareable, tamper-evident artifact (ADR 0006, 0007). Three parts: a contract, a TypeScript client, and a share page.

## 1. `contracts/` — `ReportRegistry.sol` (Foundry)

### Interface (target)

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.x; // pin one exact version

interface IReportRegistry {
    struct Record {
        address submitter;
        uint64  recordedAt;     // block.timestamp
        bytes32 scenarioHash;   // sha256 of canonical ScenarioConfig JSON
        uint16  checksPassed;
        uint16  checksTotal;
        string  toolVersion;    // e.g. "0.1.0"
        string  uri;            // where the full result.json / report lives
    }

    event ReportRecorded(
        bytes32 indexed reportHash,
        address indexed submitter,
        bytes32 indexed scenarioHash,
        uint16 checksPassed,
        uint16 checksTotal,
        string toolVersion,
        string uri
    );

    error AlreadyRecorded(bytes32 reportHash);
    error ZeroHash();
    error InvalidChecks(uint16 passed, uint16 total);
    error UriTooLong(uint256 length);

    function record(
        bytes32 reportHash,     // sha256 of canonical RunResult JSON
        bytes32 scenarioHash,
        uint16 checksPassed,
        uint16 checksTotal,
        string calldata toolVersion,
        string calldata uri
    ) external;

    function getRecord(bytes32 reportHash) external view returns (Record memory);
    function isRecorded(bytes32 reportHash) external view returns (bool);
}
```

### Rules

- Write-once: recording an existing `reportHash` reverts with `AlreadyRecorded`.
- Reverts on zero `reportHash` or `scenarioHash`, `checksTotal == 0`, `checksPassed > checksTotal`, `uri` longer than 256 bytes, `toolVersion` longer than 32 bytes.
- No owner, no pause, no upgrade proxy, no `payable`, no external calls.
- Uses custom errors, not revert strings.

### Tests (TDD with forge; 100% line + branch coverage)

- Unit: each rule above, one test per revert path, happy path emits the exact event.
- Fuzz: any valid inputs record and read back identically; any `passed > total` reverts.
- Invariant: a recorded record never changes; `isRecorded` is monotonic (never goes true → false).
- `forge coverage` must report 100% lines and branches; `slither .` has no high/medium findings.
- Deploy script (`script/Deploy.s.sol`) tested against a local Anvil instance.

## 2. `packages/registry` — TypeScript client (viem)

- `toReportHash(runResult): Hex` — sha256 of canonical JSON (reuse the same canonicalizer as `report`; one implementation only).
- `buildRecordCall(runResult, uri)` — returns `{ address, abi, functionName, args }` for the human's wallet or `cast send`. **The client never holds a key.**
- `readRecord(client, reportHash)` — returns the record or `null`.
- ABI imported from Foundry's `out/` artifact at build time; a test fails if the TS ABI and the compiled ABI drift.
- Tests: unit tests with a fake viem transport; integration test against Anvil with the contract deployed.

## 3. `packages/share` — share page (Hono)

| Route | Returns |
|---|---|
| `GET /r/:id` | HTML report page with a **Chain record** panel |
| `GET /r/:id/result.json` | The stored `RunResult` |
| `GET /badge/:id.png` | Social card image (PASS/FAIL, worst failing check, "simulated · not an audit") |

Chain record panel logic (runs server-side, and again in the browser via WebCrypto + viem for independent checking):

1. Recompute the sha256 of the stored `result.json`.
2. Read `getRecord(hash)` from the registry on Monad.
3. Show one of:
   - **Recorded on Monad** — block time, submitter address (shortened, linked to an explorer), checks passed/total, "hash matches".
   - **Not recorded** — "This report has not been recorded on-chain."
   - **Mismatch** — "The stored report does not match any on-chain record." (should never happen; indicates tampering or a bug)

Wording rules: never "verified safe", "audited", "certified". The panel explains in one line: *"Recording proves this report hasn't changed since it was published and who published it. It says nothing about whether the token is safe."*

Open Graph / Twitter card meta tags point at `/badge/:id.png` so links unfurl on X and Farcaster.

## 4. `cli publish`

`launchsim publish ./launchsim-report --uri https://<host>/r/<id>` prints the exact `cast send` command (and a viem snippet) for the human to run with their own wallet. It does not sign. After the tx, `launchsim verify <id>` reads the chain and prints the panel result.

## Config

`LAUNCHSIM_RPC_URL`, `LAUNCHSIM_REGISTRY_ADDRESS`, `LAUNCHSIM_CHAIN_ID` — read only in `cli` and `share`. Get Monad RPC URLs and chain IDs from Monad's official developer docs; do not hard-code guesses.
