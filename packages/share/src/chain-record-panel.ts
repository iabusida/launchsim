import type { Address, PublicClient } from "viem";
import type { RunResult } from "@launchsim/report";
import { readRecord, toReportHash, type ReportRecord } from "@launchsim/registry";

/**
 * The share page's chain record panel (docs/12): three states, never
 * "verified safe" -- recording proves integrity and authorship, nothing
 * about whether the token is safe (ADR 0007).
 */
export type ChainRecordStatus = "recorded" | "not-recorded" | "mismatch";

/** {@link getChainRecordPanel}'s result. */
export interface ChainRecordPanel {
  readonly status: ChainRecordStatus;
  readonly record: ReportRecord | null;
}

/**
 * Recomputes `runResult`'s report hash, reads its record from the chain,
 * and classifies the result (docs/12). "mismatch" should never happen in
 * practice -- the report hash is content-addressed, so a tampered copy
 * simply hashes to a different, unrecorded value (surfacing as
 * "not-recorded", not "mismatch"). It exists as a defensive check: if a
 * record is found but its own `scenarioHash` field doesn't match the
 * loaded report's, something is wrong with the record or this client,
 * not just "this report wasn't recorded."
 */
export async function getChainRecordPanel(
  runResult: RunResult,
  client: PublicClient,
  registryAddress: Address,
): Promise<ChainRecordPanel> {
  const reportHash = toReportHash(runResult);
  const record = await readRecord(client, registryAddress, reportHash);
  if (!record) {
    return { status: "not-recorded", record: null };
  }
  const expectedScenarioHash = `0x${runResult.scenario.hash}`;
  if (record.scenarioHash !== expectedScenarioHash) {
    return { status: "mismatch", record };
  }
  return { status: "recorded", record };
}
