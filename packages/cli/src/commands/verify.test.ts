import { describe, it, expect, vi } from "vitest";
import { createPublicClient, custom, encodeFunctionResult, type Address, type Hex } from "viem";
import { reportRegistryAbi } from "@launchsim/registry";
import { toCanonicalJson, type RunResult } from "@launchsim/report";
import { verifyCommand } from "./verify.js";

const REGISTRY_ADDRESS: Address = "0x1111111111111111111111111111111111111111";
const SUBMITTER: Address = "0x2222222222222222222222222222222222222222";
const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

function result(): RunResult {
  return {
    schemaVersion: 1,
    tool: { name: "launchsim", version: "0.1.0" },
    scenario: { name: "hourly burn from LP", hash: "a".repeat(64), seed: 1 },
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
          return encodeFunctionResult({ abi: reportRegistryAbi, functionName: "getRecord", result: getRecordResult });
        }
        if (method === "eth_chainId") {
          return "0x1";
        }
        throw new Error(`unexpected method ${String(method)}`);
      },
    }),
  });
}

function fakeIo(fileContent: string) {
  const lines: string[] = [];
  return {
    io: {
      readFile: vi.fn(() => Promise.resolve(fileContent)),
      log: vi.fn((line: string) => {
        lines.push(line);
      }),
    },
    lines,
  };
}

describe("verifyCommand", () => {
  it("reads <reportDir>/<runId>/result.json -- matching both ReportStore's layout and where publishCommand actually writes, no extra path segment", async () => {
    const client = fakeClient({
      submitter: ZERO_ADDRESS,
      recordedAt: 0n,
      scenarioHash: `0x${"00".repeat(32)}`,
      checksPassed: 0,
      checksTotal: 0,
      toolVersion: "",
      uri: "",
    });
    const readFile = vi.fn(() => Promise.resolve(toCanonicalJson(result())));
    await verifyCommand("run1", "launchsim-report", client, REGISTRY_ADDRESS, { readFile, log: vi.fn() });
    expect(readFile).toHaveBeenCalledWith("launchsim-report/run1/result.json");
  });

  it("prints 'Recorded on Monad' and returns exit code 0 when the record matches", async () => {
    const client = fakeClient({
      submitter: SUBMITTER,
      recordedAt: 999n,
      scenarioHash: `0x${"a".repeat(64)}`,
      checksPassed: 1,
      checksTotal: 1,
      toolVersion: "0.1.0",
      uri: "https://example.com",
    });
    const { io, lines } = fakeIo(toCanonicalJson(result()));
    const exitCode = await verifyCommand("run1", "launchsim-report", client, REGISTRY_ADDRESS, io);
    expect(exitCode).toBe(0);
    expect(lines.join("\n")).toContain("Recorded on Monad");
    expect(lines.join("\n")).toContain(SUBMITTER);
  });

  it("prints 'Not recorded' and returns exit code 1 when there is no record", async () => {
    const client = fakeClient({
      submitter: ZERO_ADDRESS,
      recordedAt: 0n,
      scenarioHash: `0x${"00".repeat(32)}`,
      checksPassed: 0,
      checksTotal: 0,
      toolVersion: "",
      uri: "",
    });
    const { io, lines } = fakeIo(toCanonicalJson(result()));
    const exitCode = await verifyCommand("run1", "launchsim-report", client, REGISTRY_ADDRESS, io);
    expect(exitCode).toBe(1);
    expect(lines.join("\n")).toContain("Not recorded");
  });

  it("prints 'Mismatch' and returns exit code 1 when the record's scenarioHash doesn't match", async () => {
    const client = fakeClient({
      submitter: SUBMITTER,
      recordedAt: 999n,
      scenarioHash: `0x${"b".repeat(64)}`,
      checksPassed: 1,
      checksTotal: 1,
      toolVersion: "0.1.0",
      uri: "https://example.com",
    });
    const { io, lines } = fakeIo(toCanonicalJson(result()));
    const exitCode = await verifyCommand("run1", "launchsim-report", client, REGISTRY_ADDRESS, io);
    expect(exitCode).toBe(1);
    expect(lines.join("\n")).toContain("Mismatch");
  });

  it("never claims a token is safe or audited (docs/08, docs/12)", async () => {
    const client = fakeClient({
      submitter: SUBMITTER,
      recordedAt: 999n,
      scenarioHash: `0x${"a".repeat(64)}`,
      checksPassed: 1,
      checksTotal: 1,
      toolVersion: "0.1.0",
      uri: "https://example.com",
    });
    const { io, lines } = fakeIo(toCanonicalJson(result()));
    await verifyCommand("run1", "launchsim-report", client, REGISTRY_ADDRESS, io);
    const output = lines.join("\n").toLowerCase();
    expect(output).not.toContain("verified safe");
    expect(output).not.toContain("audited");
    expect(output).not.toContain("rug-proof");
  });

  it("returns exit code 2 and logs an error when the report can't be read", async () => {
    const client = fakeClient({
      submitter: ZERO_ADDRESS,
      recordedAt: 0n,
      scenarioHash: `0x${"00".repeat(32)}`,
      checksPassed: 0,
      checksTotal: 0,
      toolVersion: "",
      uri: "",
    });
    const io = { readFile: vi.fn(() => Promise.reject(new Error("ENOENT"))), log: vi.fn() };
    const exitCode = await verifyCommand("missing", "launchsim-report", client, REGISTRY_ADDRESS, io);
    expect(exitCode).toBe(2);
    expect(io.log).toHaveBeenCalledWith(expect.stringContaining("error"));
  });

  it("stringifies a non-Error thrown value", async () => {
    const client = fakeClient({
      submitter: ZERO_ADDRESS,
      recordedAt: 0n,
      scenarioHash: `0x${"00".repeat(32)}`,
      checksPassed: 0,
      checksTotal: 0,
      toolVersion: "",
      uri: "",
    });
    const io = {
      readFile: vi.fn(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- deliberately testing non-Error throw handling
        throw "boom";
      }),
      log: vi.fn(),
    };
    const exitCode = await verifyCommand("missing", "launchsim-report", client, REGISTRY_ADDRESS, io);
    expect(exitCode).toBe(2);
    expect(io.log).toHaveBeenCalledWith("error: boom");
  });
});
