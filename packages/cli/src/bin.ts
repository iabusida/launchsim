#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runCommand, type RunCommandIo } from "./commands/run.js";

/**
 * The real I/O `runCommand` needs: dynamic `import()` for scenario
 * modules, and `fs` for report output. Requires a Node runtime that can
 * load the scenario file directly (a built `.js` file, or a Node version
 * with TypeScript type-stripping enabled) -- this wiring does not bundle
 * a TypeScript loader itself.
 */
const io: RunCommandIo = {
  readScenario: (path) => import(pathToFileURL(resolve(path)).href),
  writeFile: async (path, content) => {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, "utf8");
  },
  log: (line) => {
    console.log(line);
  },
};

async function main(): Promise<void> {
  const [command, scenarioPath] = process.argv.slice(2);
  if (command !== "run" || !scenarioPath) {
    console.error("usage: launchsim run <scenario-path>");
    process.exitCode = 2;
    return;
  }
  process.exitCode = await runCommand(scenarioPath, io);
}

await main();
