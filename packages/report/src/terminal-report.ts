import type { RunResult } from "./run-result.js";

/**
 * Renders a `RunResult` as the terminal summary (docs/04):
 * ```
 * ✗ hourly burn from LP   (seed 42 · math mode · launchsim 0.1.0)
 *   ✗ pool SOL fell to 18% of peak at hour 31
 *   report → ./launchsim-report/index.html
 * ```
 *
 * @param result - The completed run.
 * @param reportPath - Where the HTML report was (or will be) written.
 */
export function renderTerminalReport(result: RunResult, reportPath: string): string {
  const badge = result.passed ? "✓" : "✗";
  const lines = [
    `${badge} ${result.scenario.name}   (seed ${String(result.scenario.seed)} · ${result.mode} mode · launchsim ${result.tool.version})`,
  ];
  for (const check of result.checks) {
    lines.push(`  ${check.passed ? "✓" : "✗"} ${check.summary}`);
  }
  lines.push(`  report → ${reportPath}`);
  return lines.join("\n");
}

/**
 * The process exit code for a run (docs/04): `0` if all checks passed,
 * `1` if any failed, `2` if there is no result at all (an invalid
 * scenario or an internal error, caught upstream of this function).
 */
export function exitCodeForResult(result: RunResult | null): 0 | 1 | 2 {
  if (result === null) {
    return 2;
  }
  return result.passed ? 0 : 1;
}
