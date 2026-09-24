import type { Address, Hex } from "viem";
import type { RunResult } from "@launchsim/report";
import { reportRegistryAbi } from "./abi.js";
import { toReportHash } from "./report-hash.js";

/**
 * A `ReportRegistry.record` call, ready for the human's own wallet or
 * `cast send` (docs/12: `cli publish` prints this; it never signs).
 */
export interface RecordCall {
  readonly address: Address;
  readonly abi: typeof reportRegistryAbi;
  readonly functionName: "record";
  readonly args: readonly [Hex, Hex, number, number, string, string];
}

/**
 * Builds the call to record `runResult` on `registryAddress`. Never holds
 * or asks for a key -- this only encodes the call; nothing here signs or
 * sends it (docs/08 golden rule 7, docs/12).
 *
 * @param uri Where the full report lives (e.g. the share page's URL).
 */
export function buildRecordCall(runResult: RunResult, uri: string, registryAddress: Address): RecordCall {
  const checksPassed = runResult.checks.filter((check) => check.passed).length;
  const checksTotal = runResult.checks.length;
  return {
    address: registryAddress,
    abi: reportRegistryAbi,
    functionName: "record",
    args: [
      toReportHash(runResult),
      `0x${runResult.scenario.hash}`,
      checksPassed,
      checksTotal,
      runResult.tool.version,
      uri,
    ],
  };
}
