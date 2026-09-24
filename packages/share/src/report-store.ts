import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseRunResultJson, type RunResult } from "@launchsim/report";

/** Where reports live, keyed by `runId` (docs/05). Filesystem and in-memory implementations below. */
export interface ReportStore {
  get(runId: string): Promise<RunResult | null>;
}

/** An in-memory fake for tests (docs/05, docs/07: "fakes only at I/O boundaries"). */
export function createInMemoryReportStore(initial: Readonly<Record<string, RunResult>> = {}): ReportStore {
  const reports = new Map(Object.entries(initial));
  return {
    get(runId) {
      return Promise.resolve(reports.get(runId) ?? null);
    },
  };
}

const VALID_RUN_ID = /^[0-9a-zA-Z_-]+$/;

function isEnoent(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

/**
 * Reads `<dir>/<runId>/result.json` (docs/05). Rejects a `runId` with
 * anything other than alphanumerics, `_`, or `-` before touching the
 * filesystem, so a malformed id (e.g. `../../etc/passwd`) can never
 * escape `dir` (docs/10).
 */
export function createFsReportStore(dir: string): ReportStore {
  return {
    async get(runId) {
      if (!VALID_RUN_ID.test(runId)) {
        throw new RangeError(`createFsReportStore: invalid runId "${runId}"`);
      }
      try {
        const raw = await readFile(join(dir, runId, "result.json"), "utf8");
        return parseRunResultJson(raw);
      } catch (error) {
        if (isEnoent(error)) {
          return null;
        }
        throw error;
      }
    },
  };
}
