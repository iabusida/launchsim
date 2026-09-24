import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { RunResult } from "@launchsim/report";
import { createFsReportStore, createInMemoryReportStore } from "./report-store.js";

function result(name: string): RunResult {
  return {
    schemaVersion: 1,
    tool: { name: "launchsim", version: "0.1.0" },
    scenario: { name, hash: "a".repeat(64), seed: 1 },
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

describe("createInMemoryReportStore", () => {
  it("returns a stored report by runId", async () => {
    const store = createInMemoryReportStore({ abc: result("a") });
    expect(await store.get("abc")).toEqual(result("a"));
  });

  it("returns null for an unknown runId", async () => {
    const store = createInMemoryReportStore({});
    expect(await store.get("nope")).toBeNull();
  });

  it("starts empty when given no initial reports", async () => {
    const store = createInMemoryReportStore();
    expect(await store.get("anything")).toBeNull();
  });
});

describe("createFsReportStore", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "launchsim-share-test-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns null for a runId with no result.json file", async () => {
    const store = createFsReportStore(dir);
    expect(await store.get("missing")).toBeNull();
  });

  it("reads back a report written as <dir>/<runId>/result.json, bigints intact", async () => {
    const { writeFile, mkdir } = await import("node:fs/promises");
    const runId = "run1";
    await mkdir(join(dir, runId), { recursive: true });
    const withBigint: RunResult = {
      ...result("with bigint"),
      timeline: { samples: [{ slot: 0, quoteReserve: 123n, baseReserve: 456n }], peakQuoteReserve: 123n },
    };
    const { toCanonicalJson } = await import("@launchsim/report");
    await writeFile(join(dir, runId, "result.json"), toCanonicalJson(withBigint), "utf8");

    const store = createFsReportStore(dir);
    const got = await store.get(runId);
    expect(got?.scenario.name).toBe("with bigint");
    expect(got?.timeline.samples[0]?.quoteReserve).toBe(123n);
    expect(got?.timeline.peakQuoteReserve).toBe(123n);
  });

  it("rejects a runId with path-traversal characters rather than reading outside dir", async () => {
    const store = createFsReportStore(dir);
    await expect(store.get("../../etc/passwd")).rejects.toThrow(/invalid runId/);
  });

  it("re-throws a non-ENOENT filesystem error rather than treating it as unrecorded", async () => {
    const { mkdir } = await import("node:fs/promises");
    const runId = "run2";
    // result.json is itself a directory, not a file: readFile fails with
    // EISDIR, not ENOENT -- a different error class the store must not swallow.
    await mkdir(join(dir, runId, "result.json"), { recursive: true });
    const store = createFsReportStore(dir);
    await expect(store.get(runId)).rejects.toThrow();
  });
});
