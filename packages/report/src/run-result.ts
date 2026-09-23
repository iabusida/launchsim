import type { CheckResult, EngineResult, MechanicEvent, Timeline, TradeRecord } from "@launchsim/core";

/** The tool identity a report was produced by. */
export interface RunResultTool {
  readonly name: "launchsim";
  readonly version: string;
}

/** The scenario a `RunResult` was produced from. */
export interface RunResultScenario {
  readonly name: string;
  readonly hash: string;
  readonly seed: number;
}

/** The market a scenario ran against. */
export interface RunResultMarket {
  readonly kind: string;
  readonly params: Readonly<Record<string, string>>;
}

/**
 * The canonical, versioned result of one run (docs/04, schemaVersion 1).
 * Every report states the engine mode, seed, and tool version, and never
 * implies a token is safe (docs/08 golden rule 9).
 */
export interface RunResult {
  readonly schemaVersion: 1;
  readonly tool: RunResultTool;
  readonly scenario: RunResultScenario;
  readonly mode: "math" | "chain";
  readonly market: RunResultMarket;
  readonly durationSlots: number;
  readonly timeline: Timeline;
  readonly mechanicEvents: readonly MechanicEvent[];
  readonly trades: readonly TradeRecord[];
  readonly checks: readonly CheckResult[];
  readonly passed: boolean;
  readonly simulated: readonly string[];
  readonly notSimulated: readonly string[];
}

/** {@link buildRunResult}'s input: an engine run plus the metadata a report needs around it. */
export interface BuildRunResultInput {
  readonly scenarioName: string;
  readonly scenarioHash: string;
  readonly seed: number;
  readonly toolVersion: string;
  readonly mode: "math" | "chain";
  readonly market: RunResultMarket;
  readonly engineResult: EngineResult;
  readonly checks: readonly CheckResult[];
  readonly simulated: readonly string[];
  readonly notSimulated: readonly string[];
}

/**
 * Assembles a {@link RunResult} from an engine run and its checks.
 *
 * @throws {RangeError} If `notSimulated` is empty -- every report must
 *   state its limitations (docs/10: "always present").
 */
export function buildRunResult(input: BuildRunResultInput): RunResult {
  if (input.notSimulated.length === 0) {
    throw new RangeError("buildRunResult: notSimulated must be non-empty (docs/10)");
  }
  return {
    schemaVersion: 1,
    tool: { name: "launchsim", version: input.toolVersion },
    scenario: { name: input.scenarioName, hash: input.scenarioHash, seed: input.seed },
    mode: input.mode,
    market: input.market,
    durationSlots: input.engineResult.durationSlots,
    timeline: input.engineResult.timeline,
    mechanicEvents: [...input.engineResult.mechanicEvents],
    trades: [...input.engineResult.trades],
    checks: [...input.checks],
    passed: input.checks.every((check) => check.passed),
    simulated: [...input.simulated],
    notSimulated: [...input.notSimulated],
  };
}
