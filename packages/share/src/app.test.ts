import { describe, it, expect } from "vitest";
import { createPublicClient, custom, encodeFunctionResult, type Address, type Hex } from "viem";
import { reportRegistryAbi } from "@launchsim/registry";
import type { RunResult } from "@launchsim/report";
import { createApp } from "./app.js";
import { createInMemoryReportStore } from "./report-store.js";
import { createInMemoryReportsIndexClient, type IndexedReport } from "./reports-index.js";

const REGISTRY_ADDRESS: Address = "0x1111111111111111111111111111111111111111";
const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

function result(overrides: Partial<RunResult> = {}): RunResult {
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
    checks: [
      { id: "a", kind: "quoteNeverBelowPctOfPeak", passed: false, summary: "pool quote fell to 48%", observed: "4800", threshold: "5000", atSlot: 100 },
    ],
    passed: false,
    simulated: ["x"],
    notSimulated: ["y"],
    ...overrides,
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

const NOT_RECORDED_RESULT: GetRecordResult = {
  submitter: ZERO_ADDRESS,
  recordedAt: 0n,
  scenarioHash: `0x${"00".repeat(32)}`,
  checksPassed: 0,
  checksTotal: 0,
  toolVersion: "",
  uri: "",
};

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
        throw new Error(`unexpected method ${String(method)}`);
      },
    }),
  });
}

function testApp(reports: Record<string, RunResult> = {}, client = fakeClient(NOT_RECORDED_RESULT)) {
  return createApp({
    store: createInMemoryReportStore(reports),
    client,
    registryAddress: REGISTRY_ADDRESS,
    baseUrl: "https://example.com",
  });
}

describe("GET /r/:id/result.json", () => {
  it("returns the stored RunResult as canonical JSON", async () => {
    const app = testApp({ abc: result() });
    const res = await app.request("/r/abc/result.json");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body: unknown = await res.json();
    expect((body as { scenario: { name: string } }).scenario.name).toBe("hourly burn from LP");
  });

  it("returns 404 for an unknown id", async () => {
    const app = testApp();
    const res = await app.request("/r/nope/result.json");
    expect(res.status).toBe(404);
  });
});

describe("GET /badge/:id.png", () => {
  it("returns a PNG image for a known id", async () => {
    const app = testApp({ abc: result() });
    const res = await app.request("/badge/abc.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes.slice(0, 4)).toEqual(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
  });

  it("returns 404 for an unknown id", async () => {
    const app = testApp();
    const res = await app.request("/badge/nope.png");
    expect(res.status).toBe(404);
  });
});

describe("GET /r/:id", () => {
  it("returns the HTML report page with a chain record panel for a known id", async () => {
    const app = testApp({ abc: result() });
    const res = await app.request("/r/abc");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("hourly burn from LP");
    expect(html).toContain("Not recorded");
  });

  it("shows the recorded panel with the submitter and check counts when the chain has a matching record", async () => {
    const SUBMITTER: Address = "0x2222222222222222222222222222222222222222";
    const client = fakeClient({
      submitter: SUBMITTER,
      recordedAt: 999n,
      scenarioHash: `0x${"a".repeat(64)}`,
      checksPassed: 1,
      checksTotal: 1,
      toolVersion: "0.1.0",
      uri: "https://example.com/r/abc",
    });
    const app = testApp({ abc: result() }, client);
    const html = await (await app.request("/r/abc")).text();
    expect(html).toContain("Recorded on Monad");
    expect(html).toContain(SUBMITTER);
    expect(html).toContain("hash matches");
  });

  it("shows the mismatch panel when a record exists but its scenarioHash doesn't match", async () => {
    const client = fakeClient({
      submitter: "0x2222222222222222222222222222222222222222",
      recordedAt: 999n,
      scenarioHash: `0x${"b".repeat(64)}`, // doesn't match result()'s scenario.hash ("a"*64)
      checksPassed: 1,
      checksTotal: 1,
      toolVersion: "0.1.0",
      uri: "https://example.com/r/abc",
    });
    const app = testApp({ abc: result() }, client);
    const html = await (await app.request("/r/abc")).text();
    expect(html).toContain("Mismatch");
    expect(html).toContain("does not match any on-chain record");
  });

  it("includes Open Graph and Twitter card tags pointing at the badge", async () => {
    const app = testApp({ abc: result() });
    const res = await app.request("/r/abc");
    const html = await res.text();
    expect(html).toContain('property="og:image"');
    expect(html).toContain("https://example.com/badge/abc.png");
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain("FAIL");
  });

  it("shows PASS in the og:title for a passing run", async () => {
    const app = testApp({ abc: result({ passed: true, checks: [] }) });
    const html = await (await app.request("/r/abc")).text();
    expect(html).toContain("PASS");
  });

  it("never claims a token is safe, audited, or rug-proof, even in the chain panel wording (docs/08, docs/12)", async () => {
    const app = testApp({ abc: result() });
    const res = await app.request("/r/abc");
    const html = (await res.text()).toLowerCase();
    expect(html).not.toContain("verified safe");
    expect(html).not.toContain("rug-proof");
    expect(html).not.toContain("audited");
  });

  it("returns 404 for an unknown id", async () => {
    const app = testApp();
    const res = await app.request("/r/nope");
    expect(res.status).toBe(404);
  });
});

function indexedReport(overrides: Partial<IndexedReport> = {}): IndexedReport {
  return {
    id: "40aa14dd7eb317f8",
    submitter: "0x6160951C000000000000000000000000000a9CFE",
    scenarioHash: `0x${"a".repeat(64)}`,
    checksPassed: 1,
    checksTotal: 1,
    toolVersion: "0.1.0",
    uri: "https://example.com/r/40aa14dd7eb317f8",
    recordedAtBlock: 65183300n,
    recordedAtTimestamp: 1790300291n,
    transactionHash: "0xb3c9ea96f322b202da53dc4029772153c6a3843e2f1adaf5e191ddc02177eac2",
    ...overrides,
  };
}

describe("GET /reports", () => {
  it("says the index isn't configured when no reportsIndex was given", async () => {
    const app = createApp({
      store: createInMemoryReportStore(),
      client: fakeClient(NOT_RECORDED_RESULT),
      registryAddress: REGISTRY_ADDRESS,
      baseUrl: "https://example.com",
    });
    const res = await app.request("/reports");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("not configured");
  });

  it("lists indexed reports as links to their /r/:id page, most recent first", async () => {
    const older = indexedReport({ id: "old-run", recordedAtTimestamp: 100n, checksPassed: 0 });
    const newer = indexedReport({ id: "new-run", recordedAtTimestamp: 200n });
    const app = createApp({
      store: createInMemoryReportStore(),
      client: fakeClient(NOT_RECORDED_RESULT),
      registryAddress: REGISTRY_ADDRESS,
      baseUrl: "https://example.com",
      reportsIndex: createInMemoryReportsIndexClient([older, newer]),
    });
    const res = await app.request("/reports");
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('href="/r/new-run"');
    expect(html).toContain('href="/r/old-run"');
    expect(html.indexOf("new-run")).toBeLessThan(html.indexOf("old-run"));
    expect(html).toContain("1/1 checks passed");
    expect(html).toContain("0/1 checks passed");
  });

  it("shows an honest empty state when the index has no reports yet", async () => {
    const app = createApp({
      store: createInMemoryReportStore(),
      client: fakeClient(NOT_RECORDED_RESULT),
      registryAddress: REGISTRY_ADDRESS,
      baseUrl: "https://example.com",
      reportsIndex: createInMemoryReportsIndexClient([]),
    });
    const html = await (await app.request("/reports")).text();
    expect(html).toContain("No reports recorded yet");
  });

  it("never claims a token is safe, audited, or rug-proof on the browse page (docs/08)", async () => {
    const app = createApp({
      store: createInMemoryReportStore(),
      client: fakeClient(NOT_RECORDED_RESULT),
      registryAddress: REGISTRY_ADDRESS,
      baseUrl: "https://example.com",
      reportsIndex: createInMemoryReportsIndexClient([indexedReport()]),
    });
    const html = (await (await app.request("/reports")).text()).toLowerCase();
    expect(html).not.toContain("verified safe");
    expect(html).not.toContain("rug-proof");
    expect(html).not.toContain("audited");
  });
});
