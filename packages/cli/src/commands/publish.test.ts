import { describe, it, expect, vi } from "vitest";
import { toCanonicalJson, type RunResult } from "@launchsim/report";
import { publishCommand } from "./publish.js";

const REGISTRY_ADDRESS = "0x1111111111111111111111111111111111111111";

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
    checks: [
      { id: "a", kind: "quoteNeverBelowPctOfPeak", passed: true, summary: "s", observed: "1", threshold: "1", atSlot: null },
    ],
    passed: true,
    simulated: ["x"],
    notSimulated: ["y"],
  };
}

function fakeIo(fileContent: string) {
  const files = new Map<string, string>();
  const lines: string[] = [];
  return {
    io: {
      readFile: vi.fn(() => Promise.resolve(fileContent)),
      writeFile: vi.fn((path: string, content: string) => {
        files.set(path, content);
        return Promise.resolve();
      }),
      log: vi.fn((line: string) => {
        lines.push(line);
      }),
    },
    files,
    lines,
  };
}

describe("publishCommand", () => {
  it("prints a cast send command with the encoded call's exact args", async () => {
    const { io, lines } = fakeIo(toCanonicalJson(result()));
    const exitCode = await publishCommand(
      "launchsim-report",
      "https://example.com/r/abc",
      REGISTRY_ADDRESS,
      io,
    );
    expect(exitCode).toBe(0);
    const output = lines.join("\n");
    expect(output).toContain("cast send");
    expect(output).toContain(REGISTRY_ADDRESS);
    expect(output).toContain("https://example.com/r/abc");
    expect(output).toContain("0.1.0");
  });

  it("prints a viem snippet as an alternative to cast", async () => {
    const { io, lines } = fakeIo(toCanonicalJson(result()));
    await publishCommand("launchsim-report", "https://example.com/r/abc", REGISTRY_ADDRESS, io);
    expect(lines.join("\n")).toContain("writeContract");
  });

  it("prints the computed runId", async () => {
    const { io, lines } = fakeIo(toCanonicalJson(result()));
    await publishCommand("launchsim-report", "https://example.com/r/abc", REGISTRY_ADDRESS, io);
    expect(lines.join("\n")).toMatch(/runId: [0-9a-f]{16}/);
  });

  it("writes the report under <reportDir>/<runId>/result.json, matching ReportStore's layout exactly, for the share page to find", async () => {
    const { io, files } = fakeIo(toCanonicalJson(result()));
    await publishCommand("launchsim-report", "https://example.com/r/abc", REGISTRY_ADDRESS, io);
    const runId = [...files.keys()]
      .map((p) => /^launchsim-report\/([0-9a-f]{16})\/result\.json$/.exec(p)?.[1])
      .find((match) => match !== undefined);
    if (!runId) {
      throw new Error("expected a launchsim-report/<runId>/result.json entry");
    }
    expect(runId).toMatch(/^[0-9a-f]{16}$/);
    expect(files.has(`launchsim-report/${runId}/result.json`)).toBe(true);
    // Not nested under a `published/` segment -- ReportStore reads <dir>/<runId>/result.json directly.
    expect([...files.keys()]).not.toContain(`launchsim-report/published/${runId}/result.json`);
  });

  it("never signs or asks for a key: no private key or mnemonic appears anywhere in its output", async () => {
    const { io, lines } = fakeIo(toCanonicalJson(result()));
    await publishCommand("launchsim-report", "https://example.com/r/abc", REGISTRY_ADDRESS, io);
    const output = lines.join("\n").toLowerCase();
    expect(output).not.toContain("private key");
    expect(output).not.toContain("0xac0974bec");
  });

  it("returns exit code 2 and logs an error when the report can't be read", async () => {
    const io = {
      readFile: vi.fn(() => Promise.reject(new Error("ENOENT"))),
      writeFile: vi.fn(() => Promise.resolve()),
      log: vi.fn(),
    };
    const exitCode = await publishCommand("missing-dir", "https://example.com/r/x", REGISTRY_ADDRESS, io);
    expect(exitCode).toBe(2);
    expect(io.log).toHaveBeenCalledWith(expect.stringContaining("error"));
  });

  it("stringifies a non-Error thrown value", async () => {
    const io = {
      readFile: vi.fn(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- deliberately testing non-Error throw handling
        throw "boom";
      }),
      writeFile: vi.fn(() => Promise.resolve()),
      log: vi.fn(),
    };
    const exitCode = await publishCommand("missing-dir", "https://example.com/r/x", REGISTRY_ADDRESS, io);
    expect(exitCode).toBe(2);
    expect(io.log).toHaveBeenCalledWith("error: boom");
  });
});
