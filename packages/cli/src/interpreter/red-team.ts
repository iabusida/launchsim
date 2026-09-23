import type { ScenarioConfig } from "@launchsim/core";
import { runScenario } from "./run-scenario.js";

/** An inclusive integer search range for the actor `count` being varied. */
export interface RedTeamBounds {
  readonly min: number;
  readonly max: number;
}

/** {@link findSmallestBreak}'s result. */
export interface RedTeamResult {
  readonly checkKind: string;
  readonly found: boolean;
  readonly breakingValue: number | null;
  readonly baselineObserved: string;
  readonly breakingObserved: string | null;
}

function countOf(config: ScenarioConfig, actorIndex: number): number {
  const actor = config.actors[actorIndex];
  if (!actor || !("count" in actor)) {
    throw new RangeError(
      `findSmallestBreak: actors[${String(actorIndex)}] has no "count" field to vary`,
    );
  }
  return actor.count;
}

function withCount(config: ScenarioConfig, actorIndex: number, count: number): ScenarioConfig {
  return {
    ...config,
    actors: config.actors.map((actor, index) => (index === actorIndex ? { ...actor, count } : actor)),
  };
}

/**
 * The AI red-team search (docs/09 Phase B): a linear scan, not a
 * hill-climb -- scenario runs are fast (well under a second) and the
 * underlying simulation isn't guaranteed monotonic in an actor count, so
 * a linear scan is both simpler and more honest than a search that
 * assumes monotonicity it can't prove. Varies `actors[actorIndex].count`
 * over `bounds`, running the full scenario at each step, and returns the
 * smallest value in range at which `checkKind` first fails.
 *
 * @throws {RangeError} If `checkKind` isn't one of the baseline scenario's
 *   checks, or `actors[actorIndex]` has no `count` field to vary.
 */
export function findSmallestBreak(
  baseConfig: ScenarioConfig,
  actorIndex: number,
  checkKind: string,
  bounds: RedTeamBounds,
): RedTeamResult {
  countOf(baseConfig, actorIndex); // validates actorIndex/count eagerly, before any run

  const baseline = runScenario(baseConfig);
  const baselineCheck = baseline.checks.find((check) => check.kind === checkKind);
  if (!baselineCheck) {
    throw new RangeError(`findSmallestBreak: no check of kind "${checkKind}" in this scenario`);
  }

  for (let count = bounds.min; count <= bounds.max; count++) {
    const result = runScenario(withCount(baseConfig, actorIndex, count));
    const check = result.checks.find((c) => c.kind === checkKind);
    if (check && !check.passed) {
      return {
        checkKind,
        found: true,
        breakingValue: count,
        baselineObserved: baselineCheck.observed,
        breakingObserved: check.observed,
      };
    }
  }

  return {
    checkKind,
    found: false,
    breakingValue: null,
    baselineObserved: baselineCheck.observed,
    breakingObserved: null,
  };
}
