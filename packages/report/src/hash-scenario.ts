import { createHash } from "node:crypto";

/**
 * Hashes a scenario's canonical JSON config (`toCanonicalJson(config)`)
 * with sha256, hex-encoded (docs/04: `scenario.hash`). A report's `runId`
 * is later derived from the content hash, so an unchanged report always
 * gets the same id, and a changed one always gets a new one (docs/10).
 */
export function hashScenario(canonicalConfigJson: string): string {
  return createHash("sha256").update(canonicalConfigJson).digest("hex");
}
