import { describe, it, expect } from "vitest";
import { createPublicClient, custom, encodeFunctionResult, type Address, type Hex } from "viem";
import { reportRegistryAbi } from "@launchsim/registry";
import type { RunResult } from "@launchsim/report";
import { getChainRecordPanel } from "./chain-record-panel.js";

const REGISTRY_ADDRESS: Address = "0x1111111111111111111111111111111111111111";
const SUBMITTER: Address = "0x2222222222222222222222222222222222222222";
const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

function result(scenarioHash = "a".repeat(64)): RunResult {
  return {
    schemaVersion: 1,
    tool: { name: "launchsim", version: "0.1.0" },
    scenario: { name: "x", hash: scenarioHash, seed: 1 },
    mode: "math",
    market: { kind: "math/cpmm", params: {} },
    durationSlots: 0,
    timeline: { samples: [], peakQuoteReserve: 0n },
    mechanicEvents: [],
    trades: [],
    checks: [],
    passed: true,
    simulated: ["x"],
    notSimulated: ["y"],
  };
}

interface GetRecordResult {
  readonly submitter: Address;
  readonly recordedAt: bigint;
  readonly scenarioHash: Hex;
  readonly checksPassed: number;
  readonly checksTotal: number;
  readonly toolVersion: string;
  readonly uri: string;
}

function fakeClient(getRecordResult: GetRecordResult) {
  return createPublicClient({
    transport: custom({
      request: async ({ method }) => {
        await Promise.resolve();
        if (method === "eth_call") {
          return encodeFunctionResult({
            abi: reportRegistryAbi,
            functionName: "getRecord",
            result: getRecordResult,
          });
        }
        if (method === "eth_chainId") {
          return "0x1";
        }
        throw new Error(`fakeClient: unexpected RPC method "${String(method)}"`);
      },
    }),
  });
}

describe("getChainRecordPanel", () => {
  it("returns not-recorded when no record exists at the report hash", async () => {
    const client = fakeClient({
      submitter: ZERO_ADDRESS,
      recordedAt: 0n,
      scenarioHash: `0x${"00".repeat(32)}`,
      checksPassed: 0,
      checksTotal: 0,
      toolVersion: "",
      uri: "",
    });
    const panel = await getChainRecordPanel(result(), client, REGISTRY_ADDRESS);
    expect(panel.status).toBe("not-recorded");
    expect(panel.record).toBeNull();
  });

  it("returns recorded when a record exists and its scenarioHash matches", async () => {
    const scenarioHash = "b".repeat(64);
    const client = fakeClient({
      submitter: SUBMITTER,
      recordedAt: 999n,
      scenarioHash: `0x${scenarioHash}`,
      checksPassed: 3,
      checksTotal: 3,
      toolVersion: "0.1.0",
      uri: "https://example.com",
    });
    const panel = await getChainRecordPanel(result(scenarioHash), client, REGISTRY_ADDRESS);
    expect(panel.status).toBe("recorded");
    expect(panel.record?.submitter).toBe(SUBMITTER);
  });

  it("returns mismatch when a record exists but its scenarioHash doesn't match the loaded report", async () => {
    const client = fakeClient({
      submitter: SUBMITTER,
      recordedAt: 999n,
      scenarioHash: `0x${"c".repeat(64)}`, // does not match result()'s scenario.hash
      checksPassed: 1,
      checksTotal: 1,
      toolVersion: "0.1.0",
      uri: "https://example.com",
    });
    const panel = await getChainRecordPanel(result("d".repeat(64)), client, REGISTRY_ADDRESS);
    expect(panel.status).toBe("mismatch");
    expect(panel.record).not.toBeNull();
  });
});
