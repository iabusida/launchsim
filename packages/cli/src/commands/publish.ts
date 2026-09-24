import type { Address } from "viem";
import { hashScenario, parseRunResultJson, toCanonicalJson } from "@launchsim/report";
import { buildRecordCall } from "@launchsim/registry";

/** I/O `publishCommand` needs, injected for testing without a real filesystem (docs/01). */
export interface PublishCommandIo {
  readonly readFile: (path: string) => Promise<string>;
  readonly writeFile: (path: string, content: string) => Promise<void>;
  readonly log: (line: string) => void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function castSendCommand(
  address: Address,
  args: readonly [string, string, number, number, string, string],
): string {
  return [
    "cast send",
    address,
    `"record(bytes32,bytes32,uint16,uint16,string,string)"`,
    args[0],
    args[1],
    String(args[2]),
    String(args[3]),
    `"${args[4]}"`,
    `"${args[5]}"`,
    "--rpc-url <RPC_URL>",
    "--account <KEYSTORE_NAME>",
  ].join(" ");
}

function viemSnippet(
  address: Address,
  args: readonly [string, string, number, number, string, string],
): string {
  return [
    "// Run this yourself, with your own wallet (docs/08 golden rule 7 -- launchsim never signs):",
    'import { createWalletClient, http } from "viem";',
    "",
    "const walletClient = createWalletClient({ account, transport: http(RPC_URL) });",
    "await walletClient.writeContract({",
    `  address: "${address}",`,
    "  abi: reportRegistryAbi, // from @launchsim/registry",
    '  functionName: "record",',
    `  args: [${args.map((arg) => (typeof arg === "string" ? `"${arg}"` : String(arg))).join(", ")}],`,
    "});",
  ].join("\n");
}

/**
 * `launchsim publish <reportDir> --uri <uri>` (docs/12): builds the
 * `ReportRegistry.record` call for `<reportDir>/result.json` and prints
 * the exact `cast send` command and a viem snippet for the human to run
 * with their own wallet -- this never signs or holds a key (docs/08
 * golden rule 7). Also copies the report to
 * `<reportDir>/published/<runId>/result.json` so `launchsim serve` can
 * find it (docs/05: `runId` is the report hash's first 16 hex chars).
 */
export async function publishCommand(
  reportDir: string,
  uri: string,
  registryAddress: Address,
  io: PublishCommandIo,
): Promise<0 | 2> {
  let json: string;
  try {
    json = await io.readFile(`${reportDir}/result.json`);
  } catch (error) {
    io.log(`error: ${errorMessage(error)}`);
    return 2;
  }

  const result = parseRunResultJson(json);
  const runId = hashScenario(toCanonicalJson(result)).slice(0, 16);
  const call = buildRecordCall(result, uri, registryAddress);

  io.log(`runId: ${runId}`);
  io.log("");
  io.log("cast send command:");
  io.log(castSendCommand(call.address, call.args));
  io.log("");
  io.log("or, with viem:");
  io.log(viemSnippet(call.address, call.args));

  await io.writeFile(`${reportDir}/published/${runId}/result.json`, json);
  return 0;
}
