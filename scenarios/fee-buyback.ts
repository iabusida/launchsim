import type { ScenarioConfigInput } from "@launchsim/core";

/**
 * The fee-funded fix (docs/00): identical launch and actors to
 * `hourly-burn-lp.ts`, same seed, but every hour the mechanic spends
 * accrued trading fees buying base from the pool and burning it. Quote
 * *enters* the pool before it burns, so liquidity deepens instead of
 * draining.
 *
 * Retail only, deliberately: see `hourly-burn-lp.ts`'s comment.
 *
 * Market: `nadfun-curve` (docs/06, ADR 0006) -- see `hourly-burn-lp.ts`'s
 * comment for the curve, sourcing, and graduation notes.
 */
const scenario: ScenarioConfigInput = {
  schemaVersion: 1,
  name: "fee-funded buyback",
  seed: 1,
  duration: "48h",
  sampleEvery: "1h",
  token: {
    symbol: "TEST",
    supply: "1000000000",
  },
  market: {
    kind: "nadfun-curve",
    virtualQuote: "30 MON",
    virtualBase: "1073000000000000",
    feeBps: "1%",
    graduationQuote: "1000000 MON",
  },
  mechanics: [{ kind: "feeBuyback", interval: "1h", feeShareBps: 10_000 }],
  actors: [{ group: "retail", count: 300, spend: "0.1-1 MON", over: "6h" }],
  checks: [{ kind: "quoteNeverBelowPctOfPeak", bps: 5000 }],
};

export default scenario;
