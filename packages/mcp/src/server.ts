import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ScenarioConfigSchema } from "@launchsim/core";
import { runScenario } from "@launchsim/cli";
import { renderTerminalReport } from "@launchsim/report";

const TOOL_NAME = "crash_test_scenario";

const NO_FILE_REPORT_NOTE =
  "(no report files written in MCP mode; run `launchsim run <path>` for a saved HTML/JSON report)";

const TOOL_DESCRIPTION =
  "Crash-tests a token launch: simulates a bonding curve or AMM pool against scripted market " +
  "actors (retail buyers, snipers, whales, panic sellers) and evaluates checks like pool " +
  "liquidity drawdown and sniper supply share. Returns a pass/fail report naming which check " +
  "failed and where. This is a simulation with stylized actors, not an audit or a guarantee -- " +
  "it never certifies a token as safe, and every report states what was and wasn't simulated.";

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
    TOOL_NAME,
    {
      title: "Crash-test a token launch scenario",
      description: TOOL_DESCRIPTION,
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

  return server;
}
