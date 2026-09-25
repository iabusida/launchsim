import type { Address, PublicClient } from "viem";
import { parseRunResultJson } from "@launchsim/report";
import { getChainRecordPanel, type ChainRecordPanel } from "@launchsim/registry";

/** I/O `verifyCommand` needs, injected for testing without a real filesystem (docs/01). */
export interface VerifyCommandIo {
  readonly readFile: (path: string) => Promise<string>;
  readonly log: (line: string) => void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const PANEL_COPY: Readonly<Record<ChainRecordPanel["status"], string>> = {
  recorded: "Recorded on Monad",
  "not-recorded": "Not recorded",
  mismatch: "Mismatch",
};

/**
 * `launchsim verify <runId>` (docs/12): reads the chain and prints the
 * same panel wording the share page shows -- never "verified safe";
 * recording proves integrity and authorship, not that a token is safe
 * (ADR 0007). Exit code `0` only when the on-chain record is found and
 * matches; `1` for not-recorded or mismatch; `2` if the report can't be
 * read at all.
 */
export async function verifyCommand(
  runId: string,
  reportDir: string,
  client: PublicClient,
  registryAddress: Address,
  io: VerifyCommandIo,
): Promise<0 | 1 | 2> {
  let json: string;
  try {
    json = await io.readFile(`${reportDir}/${runId}/result.json`);
  } catch (error) {
    io.log(`error: ${errorMessage(error)}`);
    return 2;
  }

  const result = parseRunResultJson(json);
  const panel = await getChainRecordPanel(result, client, registryAddress);

  io.log(PANEL_COPY[panel.status]);
  if (panel.status === "recorded" && panel.record) {
    io.log(
      `block time ${String(panel.record.recordedAt)} · submitted by ${panel.record.submitter} · ${String(panel.record.checksPassed)}/${String(panel.record.checksTotal)} checks passed · hash matches`,
    );
  } else if (panel.status === "not-recorded") {
    io.log("This report has not been recorded on-chain.");
  } else {
    io.log("The stored report does not match any on-chain record.");
  }
  io.log(
    "Recording proves this report hasn't changed since it was published and who published it. It says nothing about whether the token is safe.",
  );

  return panel.status === "recorded" ? 0 : 1;
}
