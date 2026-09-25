#!/usr/bin/env node
import { serve } from "@hono/node-server";
import { createPublicClient, http, type Address } from "viem";
import { createApp } from "./app.js";
import { createFsReportStore } from "./report-store.js";
import { createEnvioReportsIndexClient } from "./reports-index.js";

/**
 * `launchsim serve` (docs/12): reads `LAUNCHSIM_RPC_URL`,
 * `LAUNCHSIM_REGISTRY_ADDRESS`, `LAUNCHSIM_CHAIN_ID` only here and in
 * `cli` (docs/12's Config section) -- never in `core`, `report`, or
 * `registry`, which take these as plain function arguments instead.
 */
function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`launchsim-share: missing required environment variable ${name}`);
  }
  return value;
}

const rpcUrl = requiredEnv("LAUNCHSIM_RPC_URL");
const registryAddress = requiredEnv("LAUNCHSIM_REGISTRY_ADDRESS") as Address;
const reportsDir = process.env["LAUNCHSIM_REPORTS_DIR"] ?? "./launchsim-report";
const baseUrl = process.env["LAUNCHSIM_BASE_URL"] ?? "http://localhost:3000";
const port = Number(process.env["PORT"] ?? "3000");
// Optional: /reports lists every recorded report via indexer/ (Envio
// HyperIndex). Unset on a deployment that hasn't stood up the indexer.
const indexerUrl = process.env["LAUNCHSIM_INDEXER_URL"];

const app = createApp({
  store: createFsReportStore(reportsDir),
  client: createPublicClient({ transport: http(rpcUrl) }),
  registryAddress,
  baseUrl,
  ...(indexerUrl ? { reportsIndex: createEnvioReportsIndexClient(indexerUrl) } : {}),
});

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`launchsim share page listening on http://localhost:${String(info.port)}`);
});
