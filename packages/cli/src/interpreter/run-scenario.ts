import {
  createClock,
  createRng,
  parseDuration,
  runEngine,
  type ScenarioConfig,
} from "@launchsim/core";
import { buildRunResult, hashScenario, toCanonicalJson, type RunResult } from "@launchsim/report";
import { buildActors } from "./build-actors.js";
import { buildChecks } from "./build-checks.js";
import { buildMarket } from "./build-market.js";
import { buildMechanics } from "./build-mechanics.js";

/** The tool version stamped on every `RunResult` (docs/04), until Changesets versions the published packages. */
const TOOL_VERSION = "0.1.0";

/**
 * launchsim's structural limitations, true of every run regardless of
 * scenario (docs/08 golden rule 9: every report states what was not
 * simulated). Scenario-specific gaps (e.g. an unsupported actor group)
 * would surface as a thrown error during interpretation, not a silent
 * omission here.
 */
const NOT_SIMULATED = [
  "chain-level MEV and real network latency",
  "real wallet behavior beyond the configured actor strategies",
  "on-chain execution (math mode only; see docs/01 for chain mode)",
  "bundler and flipper actors (not yet implemented, docs/09)",
];

function describeActor(actor: ScenarioConfig["actors"][number]): string {
  return "count" in actor ? `${String(actor.count)} ${actor.group} actor(s)` : `1 ${actor.group}`;
}

/**
 * Interprets a validated {@link ScenarioConfig} into a market, actors,
 * mechanics, and checks (docs/02, docs/06), runs the engine, and builds
 * the resulting {@link RunResult} (docs/04). Lives in `cli`, not `core`:
 * building a `Market` needs `@launchsim/adapters`, and `core` depends on
 * nothing internal (docs/01) -- `cli` is the layer that wires them
 * together. Pure: no filesystem or console I/O; `cli run` wraps this with
 * that I/O.
 */
export function runScenario(config: ScenarioConfig): RunResult {
  const rng = createRng(config.seed);
  const clock = createClock(config.slotMs);
  const duration = parseDuration(config.duration, config.slotMs);
  const sampleEvery = parseDuration(config.sampleEvery, config.slotMs);

  const { market, quoteUnit } = buildMarket(config.market);
  const { scheduledActors, initialWallets } = buildActors(
    config.actors,
    duration,
    sampleEvery,
    config.slotMs,
    rng,
  );
  const mechanics = buildMechanics(config.mechanics, config.slotMs);
  const checks = buildChecks(config.checks, config.slotMs);

  const engineResult = runEngine({
    market,
    mechanics,
    scheduledActors,
    initialWallets,
    duration,
    sampleEvery,
    clock,
    rng,
  });

  return buildRunResult({
    scenarioName: config.name,
    scenarioHash: hashScenario(toCanonicalJson(config)),
    seed: config.seed,
    toolVersion: TOOL_VERSION,
    mode: "math",
    market: {
      kind: market.kind,
      params: {
        feeBps: config.market.feeBps,
        quoteSymbol: quoteUnit.symbol,
        quoteDecimals: String(quoteUnit.decimals),
      },
    },
    engineResult,
    checks: checks.map((check) => check.evaluate(engineResult)),
    simulated: config.actors.map(describeActor).concat(config.mechanics.map((m) => m.kind)),
    notSimulated: NOT_SIMULATED,
  });
}
