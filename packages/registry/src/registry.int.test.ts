import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawn, type ChildProcess } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEventLogs,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { RunResult } from "@launchsim/report";
import { reportRegistryAbi } from "./abi.js";
import { toReportHash } from "./report-hash.js";
import { buildRecordCall } from "./build-record-call.js";
import { readRecord } from "./read-record.js";

/**
 * docs/12: "integration test against Anvil with the contract deployed."
 * Needs a local `anvil` on PATH (docs/07's `pnpm test:integration`); skips
 * itself with a clear message if anvil isn't reachable, rather than
 * failing the whole suite for contributors without Foundry installed.
 */
const ANVIL_PORT = 8646;
const ANVIL_RPC_URL = `http://127.0.0.1:${String(ANVIL_PORT)}`;

// Anvil's well-known default test account #0 (from its fixed default
// mnemonic) -- a public, local-only dev key that ships with Foundry
// itself, never a mainnet key (docs/08 golden rule 7).
const ANVIL_ACCOUNT_0_PRIVATE_KEY: Hex =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const ARTIFACT_PATH = fileURLToPath(
  new URL("../../../contracts/out/ReportRegistry.sol/ReportRegistry.json", import.meta.url),
);

function result(scenarioHash = "a".repeat(64)): RunResult {
  return {
    schemaVersion: 1,
    tool: { name: "launchsim", version: "0.1.0" },
    scenario: { name: "int test scenario", hash: scenarioHash, seed: 1 },
    mode: "math",
    market: { kind: "math/cpmm", params: {} },
    durationSlots: 100,
    timeline: { samples: [], peakQuoteReserve: 0n },
    mechanicEvents: [],
    trades: [],
    checks: [
      {
        id: "a",
        kind: "quoteNeverBelowPctOfPeak",
        passed: true,
        summary: "s",
        observed: "1",
        threshold: "1",
        atSlot: null,
      },
    ],
    passed: true,
    simulated: ["x"],
    notSimulated: ["y"],
  };
}

let anvil: ChildProcess | undefined;
let registryAddress: Address;

beforeAll(async () => {
  anvil = spawn("anvil", ["--port", String(ANVIL_PORT), "--silent"], { stdio: "ignore" });
  await new Promise<void>((resolve, reject) => {
    anvil?.once("error", reject);
    setTimeout(resolve, 1_000); // anvil has no "ready" signal in --silent mode; a short wait is the simplest reliable option
  });

  const artifact = JSON.parse(readFileSync(ARTIFACT_PATH, "utf8")) as {
    abi: unknown;
    bytecode: { object: Hex };
  };
  const account = privateKeyToAccount(ANVIL_ACCOUNT_0_PRIVATE_KEY);
  const walletClient = createWalletClient({ account, transport: http(ANVIL_RPC_URL) });
  const publicClient = createPublicClient({ transport: http(ANVIL_RPC_URL) });

  const deployHash = await walletClient.deployContract({
    abi: reportRegistryAbi,
    bytecode: artifact.bytecode.object,
    args: [],
    chain: undefined,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
  if (!receipt.contractAddress) {
    throw new Error("registry.int.test.ts: deployment did not return a contract address");
  }
  registryAddress = receipt.contractAddress;
}, 30_000);

afterAll(() => {
  anvil?.kill();
});

describe("ReportRegistry against a real Anvil node", () => {
  it("records a report and reads it back identically", async () => {
    const account = privateKeyToAccount(ANVIL_ACCOUNT_0_PRIVATE_KEY);
    const walletClient = createWalletClient({ account, transport: http(ANVIL_RPC_URL) });
    const publicClient = createPublicClient({ transport: http(ANVIL_RPC_URL) });

    const runResult = result();
    const call = buildRecordCall(runResult, "https://example.com/r/abc", registryAddress);

    const txHash = await walletClient.writeContract({
      address: call.address,
      abi: call.abi,
      functionName: call.functionName,
      args: call.args,
      chain: undefined,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    expect(receipt.status).toBe("success");

    const events = parseEventLogs({ abi: reportRegistryAbi, logs: receipt.logs });
    expect(events).toHaveLength(1);
    expect(events[0]?.eventName).toBe("ReportRecorded");

    const record = await readRecord(publicClient, registryAddress, toReportHash(runResult));
    expect(record).not.toBeNull();
    expect(record?.submitter.toLowerCase()).toBe(account.address.toLowerCase());
    expect(record?.checksPassed).toBe(1);
    expect(record?.checksTotal).toBe(1);
    expect(record?.toolVersion).toBe("0.1.0");
    expect(record?.uri).toBe("https://example.com/r/abc");
  });

  it("returns null for an unrecorded report hash", async () => {
    const publicClient = createPublicClient({ transport: http(ANVIL_RPC_URL) });
    const neverRecorded = toReportHash(result("b".repeat(64)));
    const record = await readRecord(publicClient, registryAddress, neverRecorded);
    expect(record).toBeNull();
  });
});
