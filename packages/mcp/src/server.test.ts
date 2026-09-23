import { describe, it, expect, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createLaunchsimServer, errorMessage } from "./server.js";

const VALID_SCENARIO = {
  schemaVersion: 1,
  name: "test scenario",
  seed: 1,
  duration: "1h",
  token: { supply: "1000000" },
  market: { kind: "cpmm", quote: "30 MON", base: "1073000000000000", feeBps: "1%" },
  actors: [{ group: "retail", count: 2, spend: "0.1-1 MON", over: "10m" }],
  checks: [{ kind: "quoteNeverBelowPctOfPeak", bps: 5000 }],
};

async function connectedClient(): Promise<Client> {
  const server = createLaunchsimServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

function textOf(result: { content: readonly { type: string; text?: string }[] }): string {
  return result.content.map((block) => (block.type === "text" ? (block.text ?? "") : "")).join("\n");
}

describe("errorMessage", () => {
  it("uses the message of an Error instance", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
  });

  it("stringifies a non-Error thrown value", () => {
    expect(errorMessage("boom")).toBe("boom");
  });
});

describe("launchsim MCP server", () => {
  let client: Client | undefined;

  afterEach(async () => {
    await client?.close();
    client = undefined;
  });

  it("advertises the crash_test_scenario tool", async () => {
    client = await connectedClient();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain("crash_test_scenario");
  });

  it("runs a passing scenario and reports it in the terminal report format", async () => {
    client = await connectedClient();
    const result = await client.callTool({
      name: "crash_test_scenario",
      arguments: VALID_SCENARIO,
    });
    expect(result.isError).toBeFalsy();
    const text = textOf(result as { content: readonly { type: string; text?: string }[] });
    expect(text).toContain("test scenario");
    expect(text).toContain("✓");
  });

  it("runs a failing scenario and marks it failed", async () => {
    client = await connectedClient();
    const result = await client.callTool({
      name: "crash_test_scenario",
      arguments: {
        ...VALID_SCENARIO,
        market: { kind: "cpmm", quote: "1 MON", base: "1000000", feeBps: "1%" },
        actors: [{ group: "whale", spend: "50 MON" }],
        checks: [{ kind: "quoteNeverBelowPctOfPeak", bps: 10_000 }],
      },
    });
    expect(result.isError).toBeFalsy();
    const text = textOf(result as { content: readonly { type: string; text?: string }[] });
    expect(text).toContain("✗");
  });

  it("returns isError with a clear message for an invalid scenario config", async () => {
    client = await connectedClient();
    const result = await client.callTool({
      name: "crash_test_scenario",
      arguments: { name: "incomplete" },
    });
    expect(result.isError).toBe(true);
    const text = textOf(result as { content: readonly { type: string; text?: string }[] });
    expect(text).toContain("error:");
  });

  it("returns isError with a clear message for an actor group with no engine builder", async () => {
    client = await connectedClient();
    const result = await client.callTool({
      name: "crash_test_scenario",
      arguments: {
        ...VALID_SCENARIO,
        actors: [{ group: "bundler", totalSpend: "5 MON" }],
      },
    });
    expect(result.isError).toBe(true);
    const text = textOf(result as { content: readonly { type: string; text?: string }[] });
    expect(text).toContain("not yet implemented");
  });

  it("advertises the red_team_scenario tool", async () => {
    client = await connectedClient();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain("red_team_scenario");
  });

  it("finds the smallest sniper count that breaks a group supply share check", async () => {
    client = await connectedClient();
    const result = await client.callTool({
      name: "red_team_scenario",
      arguments: {
        scenario: {
          ...VALID_SCENARIO,
          actors: [{ group: "sniper", count: 1, spend: "1 MON", at: "slot:0", holdSlots: 5000 }],
          checks: [{ kind: "groupSupplyShareBelow", group: "sniper", at: "10m", bps: 1000 }],
        },
        actorIndex: 0,
        checkKind: "groupSupplyShareBelow",
        min: 1,
        max: 10,
      },
    });
    expect(result.isError).toBeFalsy();
    const text = textOf(result as { content: readonly { type: string; text?: string }[] });
    expect(text).toMatch(/breaks/i);
  });

  it("reports when no break was found in range", async () => {
    client = await connectedClient();
    const result = await client.callTool({
      name: "red_team_scenario",
      arguments: {
        scenario: {
          ...VALID_SCENARIO,
          actors: [
            { group: "retail", count: 100, spend: "1 MON", over: "1m" },
            { group: "sniper", count: 1, spend: "1 MON", at: "slot:0", holdSlots: 5000 },
          ],
          checks: [{ kind: "groupSupplyShareBelow", group: "sniper", at: "10m", bps: 9000 }],
        },
        actorIndex: 1,
        checkKind: "groupSupplyShareBelow",
        min: 1,
        max: 3,
      },
    });
    expect(result.isError).toBeFalsy();
    const text = textOf(result as { content: readonly { type: string; text?: string }[] });
    expect(text).toMatch(/no break/i);
  });

  it("returns isError for an invalid red-team request", async () => {
    client = await connectedClient();
    const result = await client.callTool({
      name: "red_team_scenario",
      arguments: {
        scenario: VALID_SCENARIO,
        actorIndex: 0,
        checkKind: "maxDrawdownBelow",
        min: 1,
        max: 5,
      },
    });
    expect(result.isError).toBe(true);
    const text = textOf(result as { content: readonly { type: string; text?: string }[] });
    expect(text).toContain("error:");
  });
});
