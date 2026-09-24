import type { Hex } from "viem";
import { hashScenario, toCanonicalJson, type RunResult } from "@launchsim/report";

/**
 * A hex string with the `0x` prefix viem's `Hex` type expects, sha256 of
 * `input`'s canonical JSON -- reusing `report`'s canonicalizer directly
 * (docs/12: "one implementation only"), not a second one here.
 */
export function toReportHash(runResult: RunResult): Hex {
  return `0x${hashScenario(toCanonicalJson(runResult))}`;
}
