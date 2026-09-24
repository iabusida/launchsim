import { describe, it, expect } from "vitest";
import { createPublicClient, custom, encodeFunctionResult, type Address, type Hex } from "viem";
import { reportRegistryAbi } from "./abi.js";
import { readRecord } from "./read-record.js";

const REGISTRY_ADDRESS: Address = "0x1111111111111111111111111111111111111111";
const REPORT_HASH_DIGEST: string = "ab".repeat(32);
const REPORT_HASH: Hex = `0x${REPORT_HASH_DIGEST}`;
const SUBMITTER: Address = "0x2222222222222222222222222222222222222222";
const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

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
        await Promise.resolve(); // satisfies require-await; this fake has no real async work to do
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

describe("readRecord", () => {
  it("returns the decoded record when one exists", async () => {
    const scenarioHash: Hex = `0x${"cd".repeat(32)}`;
    const client = fakeClient({
      submitter: SUBMITTER,
      recordedAt: 12345n,
      scenarioHash,
      checksPassed: 2,
      checksTotal: 3,
      toolVersion: "0.1.0",
      uri: "https://example.com",
    });
    const record = await readRecord(client, REGISTRY_ADDRESS, REPORT_HASH);
    expect(record).toEqual({
      submitter: SUBMITTER,
      recordedAt: 12345n,
      scenarioHash,
      checksPassed: 2,
      checksTotal: 3,
      toolVersion: "0.1.0",
      uri: "https://example.com",
    });
  });

  it("returns null when the record's submitter is the zero address (unrecorded)", async () => {
    const scenarioHash: Hex = `0x${"00".repeat(32)}`;
    const client = fakeClient({
      submitter: ZERO_ADDRESS,
      recordedAt: 0n,
      scenarioHash,
      checksPassed: 0,
      checksTotal: 0,
      toolVersion: "",
      uri: "",
    });
    const record = await readRecord(client, REGISTRY_ADDRESS, REPORT_HASH);
    expect(record).toBeNull();
  });
});
