import {
  createGroupSupplyShareBelowCheck,
  createMaxDrawdownBelowCheck,
  createQuoteNeverBelowPctOfPeakCheck,
  parseDuration,
  type Check,
  type ScenarioConfig,
} from "@launchsim/core";

/** Builds every check a scenario configures (docs/04) into {@link Check}s to evaluate the finished run. */
export function buildChecks(checks: ScenarioConfig["checks"], slotMs: number): Check[] {
  return checks.map((check) => {
    if (check.kind === "quoteNeverBelowPctOfPeak") {
      return createQuoteNeverBelowPctOfPeakCheck(BigInt(check.bps));
    }
    if (check.kind === "groupSupplyShareBelow") {
      return createGroupSupplyShareBelowCheck(
        check.group,
        parseDuration(check.at, slotMs),
        BigInt(check.bps),
      );
    }
    return createMaxDrawdownBelowCheck(BigInt(check.bps), parseDuration(check.window, slotMs));
  });
}
