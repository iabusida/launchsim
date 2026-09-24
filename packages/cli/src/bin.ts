#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createPublicClient, http, type Address } from "viem";
import { runCommand, type RunCommandIo } from "./commands/run.js";
import { publishCommand, type PublishCommandIo } from "./commands/publish.js";
import { verifyCommand, type VerifyCommandIo } from "./commands/verify.js";

/**
 * The real I/O these commands need. `publish`/`verify` read
 * `LAUNCHSIM_RPC_URL`/`LAUNCHSIM_REGISTRY_ADDRESS` only here (docs/12's
 * Config section: read only in `cli` and `share`) -- never signs or asks
 * for a key (docs/08 golden rule 7).
 */
const runIo: RunCommandIo = {
  readScenario: (path) => import(pathToFileURL(resolve(path)).href),
  writeFile: async (path, content) => {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, "utf8");
  },
  log: (line) => {
    console.log(line);
  },
};

const publishIo: PublishCommandIo = {
  readFile: (path) => readFile(path, "utf8"),
  writeFile: async (path, content) => {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, "utf8");
  },
  log: (line) => {
    console.log(line);
  },
};

const verifyIo: VerifyCommandIo = {
  readFile: (path) => readFile(path, "utf8"),
  log: (line) => {
    console.log(line);
  },
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`launchsim: missing required environment variable ${name}`);
  }
  return value;
}

function usage(): void {
  console.error("usage: launchsim run <scenario-path>");
  console.error("       launchsim publish <report-dir> --uri <uri>");
  console.error("       launchsim verify <runId> [<report-dir>]");
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  if (command === "run" && rest[0]) {
    process.exitCode = await runCommand(rest[0], runIo);
    return;
  }

  if (command === "publish" && rest[0]) {
    const uriIndex = rest.indexOf("--uri");
    const uri = uriIndex >= 0 ? rest[uriIndex + 1] : undefined;
    if (!uri) {
      usage();
      process.exitCode = 2;
      return;
    }
    const registryAddress = requiredEnv("LAUNCHSIM_REGISTRY_ADDRESS") as Address;
    process.exitCode = await publishCommand(rest[0], uri, registryAddress, publishIo);
    return;
  }

  if (command === "verify" && rest[0]) {
    const reportDir = rest[1] ?? "./launchsim-report";
    const rpcUrl = requiredEnv("LAUNCHSIM_RPC_URL");
    const registryAddress = requiredEnv("LAUNCHSIM_REGISTRY_ADDRESS") as Address;
    const client = createPublicClient({ transport: http(rpcUrl) });
    process.exitCode = await verifyCommand(rest[0], reportDir, client, registryAddress, verifyIo);
    return;
  }

  usage();
  process.exitCode = 2;
}

await main();
