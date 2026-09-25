import { describe, it, expect, vi, afterEach } from "vitest";
import {
  byRecordedAtDescending,
  createInMemoryReportsIndexClient,
  createEnvioReportsIndexClient,
} from "./reports-index.js";

function report(overrides: Partial<Parameters<typeof createInMemoryReportsIndexClient>[0][number]> = {}) {
  return {
    id: "0x40aa14dd7eb317f8000000000000000000000000000000000000000000abcd",
    submitter: "0x6160951C000000000000000000000000000a9CFE",
    scenarioHash: "0x1111111111111111111111111111111111111111111111111111111111ab",
    checksPassed: 1,
    checksTotal: 1,
    toolVersion: "0.1.0",
    uri: "https://your-share-host/r/40aa14dd7eb317f8",
    recordedAtBlock: 65183300n,
    recordedAtTimestamp: 1790300291n,
    transactionHash: "0xb3c9ea96f322b202da53dc4029772153c6a3843e2f1adaf5e191ddc02177eac2",
    ...overrides,
  };
}

describe("byRecordedAtDescending", () => {
  it("orders the more recently recorded report first", () => {
    const older = report({ recordedAtTimestamp: 100n });
    const newer = report({ recordedAtTimestamp: 200n });
    expect(byRecordedAtDescending(older, newer)).toBe(1);
    expect(byRecordedAtDescending(newer, older)).toBe(-1);
  });
});

describe("createInMemoryReportsIndexClient", () => {
  it("returns the given reports, most recently recorded first", async () => {
    const older = report({ id: "0xold", recordedAtTimestamp: 100n });
    const newer = report({ id: "0xnew", recordedAtTimestamp: 200n });
    const client = createInMemoryReportsIndexClient([older, newer]);
    expect(await client.listReports()).toEqual([newer, older]);
  });

  it("respects the limit option", async () => {
    const client = createInMemoryReportsIndexClient([report({ id: "0xa" }), report({ id: "0xb" })]);
    const reports = await client.listReports({ limit: 1 });
    expect(reports).toHaveLength(1);
  });
});

describe("createEnvioReportsIndexClient", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("queries the indexer's GraphQL endpoint and maps rows to IndexedReport, decoding bigint fields", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      await Promise.resolve();
      return new Response(
        JSON.stringify({
          data: {
            Report: [
              {
                id: report().id,
                submitter: report().submitter,
                scenarioHash: report().scenarioHash,
                checksPassed: 1,
                checksTotal: 1,
                toolVersion: "0.1.0",
                uri: report().uri,
                recordedAtBlock: "65183300",
                recordedAtTimestamp: "1790300291",
                transactionHash: report().transactionHash,
              },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    globalThis.fetch = fetchMock;

    const client = createEnvioReportsIndexClient("https://indexer.example/v1/graphql");
    const reports = await client.listReports({ limit: 10 });

    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0];
    if (!call) {
      throw new Error("expected fetch to have been called");
    }
    const [url, init] = call;
    const body = init?.body as string;
    expect(url).toBe("https://indexer.example/v1/graphql");
    expect(body).toContain("Report(");
    expect(body).toContain("limit: 10");

    expect(reports).toEqual([report()]);
    expect(typeof reports[0]?.recordedAtBlock).toBe("bigint");
    expect(typeof reports[0]?.recordedAtTimestamp).toBe("bigint");
  });

  it("throws with the GraphQL error message when the indexer responds with errors", async () => {
    globalThis.fetch = vi.fn<typeof fetch>(async () => {
      await Promise.resolve();
      return new Response(JSON.stringify({ errors: [{ message: "field not found" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const client = createEnvioReportsIndexClient("https://indexer.example/v1/graphql");
    await expect(client.listReports()).rejects.toThrow("field not found");
  });

  it("returns an empty list when the response has no data.Report", async () => {
    globalThis.fetch = vi.fn<typeof fetch>(async () => {
      await Promise.resolve();
      return new Response(JSON.stringify({ data: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const client = createEnvioReportsIndexClient("https://indexer.example/v1/graphql");
    await expect(client.listReports()).resolves.toEqual([]);
  });

  it("throws when the HTTP response itself is not ok", async () => {
    globalThis.fetch = vi.fn<typeof fetch>(async () => {
      await Promise.resolve();
      return new Response("service unavailable", { status: 503 });
    });

    const client = createEnvioReportsIndexClient("https://indexer.example/v1/graphql");
    await expect(client.listReports()).rejects.toThrow("503");
  });
});
