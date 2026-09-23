/**
 * @packageDocumentation
 * `@launchsim/cli`: the `launchsim` CLI (`run`, `report`, `publish`, `serve`)
 * and the `ScenarioConfig -> RunResult` interpreter it's built on. The
 * interpreter is exported so `packages/mcp` (docs/09 Phase B) can reuse the
 * same "run a scenario" logic without a second implementation.
 */
export { runScenario } from "./interpreter/run-scenario.js";
