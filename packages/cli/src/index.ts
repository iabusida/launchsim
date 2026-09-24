/**
 * @packageDocumentation
 * `@launchsim/cli`: the `launchsim` CLI (`run`, `report`, `publish`, `serve`)
 * and the `ScenarioConfig -> RunResult` interpreter it's built on. The
 * interpreter is exported so `packages/mcp` (docs/09 Phase B) can reuse the
 * same "run a scenario" logic without a second implementation.
 */
export { runScenario } from "./interpreter/run-scenario.js";
export { findSmallestBreak } from "./interpreter/red-team.js";
export type { RedTeamBounds, RedTeamResult } from "./interpreter/red-team.js";
export { runCommand } from "./commands/run.js";
export type { RunCommandIo } from "./commands/run.js";
export { publishCommand } from "./commands/publish.js";
export type { PublishCommandIo } from "./commands/publish.js";
export { verifyCommand } from "./commands/verify.js";
export type { VerifyCommandIo } from "./commands/verify.js";
