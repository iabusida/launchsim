import { ScenarioConfigSchema, type ScenarioConfig } from "@launchsim/core";
import {
  exitCodeForResult,
  renderHtmlReport,
  renderTerminalReport,
  toCanonicalJson,
  type QuoteUnit,
  type RunResult,
} from "@launchsim/report";
import { runScenario } from "../interpreter/run-scenario.js";

const REPORT_DIR = "launchsim-report";

/**
 * I/O `runCommand` needs, injected so it can be unit tested without a real
 * filesystem or module loader (docs/01: "commands tested with injected
 * I/O"). `readScenario` is expected to load and evaluate the scenario
 * module at `path` (e.g. via dynamic `import()`) and return its exports.
 */
export interface RunCommandIo {
  readonly readScenario: (path: string) => Promise<unknown>;
  readonly writeFile: (path: string, content: string) => Promise<void>;
  readonly log: (line: string) => void;
}

function toScenarioConfig(loaded: unknown): ScenarioConfig {
  const candidate =
    typeof loaded === "object" && loaded !== null && "default" in loaded ? loaded.default : loaded;
  return ScenarioConfigSchema.parse(candidate);
}

/** Exported for direct testing of its defensive boundary check; not part of the package's public API. */
export function quoteUnitFromResult(result: RunResult): QuoteUnit {
  const symbol = result.market.params["quoteSymbol"];
  const decimals = result.market.params["quoteDecimals"];
  if (!symbol || !decimals) {
    throw new RangeError("run: RunResult is missing its quote unit market params");
  }
  return { symbol, decimals: Number(decimals) };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * `launchsim run <scenarioPath>` (docs/04): loads a scenario module, runs
 * it, writes `result.json` and an HTML report under `launchsim-report/`,
 * prints the terminal summary, and returns the process exit code. Pure
 * orchestration -- all I/O goes through `io`, so the real `fs`/dynamic
 * `import()` wiring lives in `bin/launchsim.js`, not here.
 */
export async function runCommand(scenarioPath: string, io: RunCommandIo): Promise<0 | 1 | 2> {
  let result: RunResult;
  try {
    const loaded = await io.readScenario(scenarioPath);
    const config = toScenarioConfig(loaded);
    result = runScenario(config);
  } catch (error) {
    io.log(`error: ${errorMessage(error)}`);
    return 2;
  }

  const reportPath = `${REPORT_DIR}/index.html`;
  await io.writeFile(`${REPORT_DIR}/result.json`, toCanonicalJson(result));
  await io.writeFile(
    reportPath,
    renderHtmlReport(result, {
      command: `launchsim run ${scenarioPath}`,
      quoteUnit: quoteUnitFromResult(result),
    }),
  );
  io.log(renderTerminalReport(result, reportPath));
  return exitCodeForResult(result);
}
