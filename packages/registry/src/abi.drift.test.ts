import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { reportRegistryAbi } from "./abi.js";

const COMPILED_ARTIFACT = fileURLToPath(
  new URL("../../../contracts/out/ReportRegistry.sol/ReportRegistry.json", import.meta.url),
);

/**
 * docs/12: "a test fails if the TS ABI and the compiled ABI drift."
 * Requires `forge build` to have run in `contracts/` first -- CI's `test`
 * job does this (via `foundry-rs/foundry-toolchain`) before `pnpm test`;
 * locally, run `(cd contracts && forge build)` first.
 */
describe("reportRegistryAbi", () => {
  it("matches the ABI Foundry compiled from ReportRegistry.sol", () => {
    const artifact: unknown = JSON.parse(readFileSync(COMPILED_ARTIFACT, "utf8"));
    const compiledAbi = (artifact as { abi: unknown }).abi;
    expect(reportRegistryAbi).toEqual(compiledAbi);
  });
});
