import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ScenarioConfigSchema } from "@launchsim/core";
import { runScenario, findSmallestBreak } from "@launchsim/cli";
import { renderTerminalReport } from "@launchsim/report";

const CRASH_TEST_TOOL = "crash_test_scenario";
const RED_TEAM_TOOL = "red_team_scenario";

const NO_FILE_REPORT_NOTE =
  "(no report files written in MCP mode; run `launchsim run <path>` for a saved HTML/JSON report)";

const CRASH_TEST_DESCRIPTION =
  "Crash-tests a token launch: simulates a bonding curve or AMM pool against scripted market " +
  "actors (retail buyers, snipers, whales, panic sellers) and evaluates checks like pool " +
  "liquidity drawdown and sniper supply share. Returns a pass/fail report naming which check " +
  "failed and where. This is a simulation with stylized actors, not an audit or a guarantee -- " +
  "it never certifies a token as safe, and every report states what was and wasn't simulated.";

const RED_TEAM_DESCRIPTION =
  "AI red-team: given a scenario that currently passes its checks, scales up one actor group's " +
  "count (an actor group that has a `count` field: retail, sniper, or panicSeller) over the " +
  "given range and reports the smallest count that flips a named check from passing to failing " +
  "-- \"how few snipers does it take to break this?\" A linear scan, not a heuristic guess: it " +
  "actually runs the simulation at every value in range and reports the first failure found.";

/** Exported for direct testing of its non-Error branch; not part of the package's public API. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorResult(message: string): CallToolResult {
  return { content: [{ type: "text", text: `error: ${message}` }], isError: true };
}

/**
 * Builds the launchsim MCP server (docs/09 Phase B: the AI Infrastructure
 * half of the Trust/Identity & AI Infrastructure track): a single tool,
 * `crash_test_scenario`, that lets any MCP client (Claude Code, Cursor,
 * ...) run the same simulation `launchsim run` does, from a `ScenarioConfig`
 * passed as tool input rather than a file path.
 */
export function createLaunchsimServer(): McpServer {
  const server = new McpServer({ name: "launchsim", version: "0.1.0" });

  server.registerTool(
    CRASH_TEST_TOOL,
    {
      title: "Crash-test a token launch scenario",
      description: CRASH_TEST_DESCRIPTION,
      inputSchema: ScenarioConfigSchema.shape,
    },
    (input): CallToolResult => {
      try {
        const config = ScenarioConfigSchema.parse(input);
        const result = runScenario(config);
        return { content: [{ type: "text", text: renderTerminalReport(result, NO_FILE_REPORT_NOTE) }] };
      } catch (error) {
        return errorResult(errorMessage(error));
      }
    },
  );

  server.registerTool(
    RED_TEAM_TOOL,
    {
      title: "Find the smallest attack that breaks a check",
      description: RED_TEAM_DESCRIPTION,
      inputSchema: {
        scenario: ScenarioConfigSchema,
        actorIndex: z
          .number()
          .int()
          .nonnegative()
          .describe("Index into scenario.actors of the group to scale (must have a count field)"),
        checkKind: z.string().describe('Which check to break, by kind, e.g. "groupSupplyShareBelow"'),
        min: z.number().int().positive(),
        max: z.number().int().positive(),
      },
    },
    (input): CallToolResult => {
      try {
        const config = ScenarioConfigSchema.parse(input.scenario);
        const result = findSmallestBreak(config, input.actorIndex, input.checkKind, {
          min: input.min,
          max: input.max,
        });
        const text = result.found
          ? `Found: scaling actors[${String(input.actorIndex)}] to ${String(result.breakingValue)} breaks "${result.checkKind}" (baseline observed ${result.baselineObserved}, breaking observed ${String(result.breakingObserved)}).`
          : `No break found: scaling actors[${String(input.actorIndex)}] from ${String(input.min)} to ${String(input.max)} never broke "${result.checkKind}" (baseline observed ${result.baselineObserved}).`;
        return { content: [{ type: "text", text }] };
      } catch (error) {
        return errorResult(errorMessage(error));
      }
    },
  );

  return server;
}
