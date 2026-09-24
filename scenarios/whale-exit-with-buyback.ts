import type { ScenarioConfigInput } from "@launchsim/core";

/**
 * Identical mature pool, identical retail volume, identical holders,
 * identical whale exit as `whale-exit-mature-pool.ts` -- same seed, same
 * everything -- except a fee-funded buyback mechanic is already running.
 * Trading fees accrued from ongoing retail volume get spent buying back
 * into the dip as it happens, absorbing part of the whale's exit instead
 * of letting it pass straight through to the panic sellers.
 *
 * The point: this isn't a launch-day check. It's the same "does this
 * mechanic hold up under a shock" question a team can ask about a token
 * that's been trading for months, before shipping a tokenomics change.
 * Measured worst 1h drawdown at this seed: 19.86% (passes the 20% limit),
 * vs 20.70% unprotected -- see `whale-exit-mature-pool.ts`'s comment.
 */
const scenario: ScenarioConfigInput = {
  schemaVersion: 1,
  name: "whale exit, mature pool, with buyback",
  seed: 1,
  duration: "6h",
  sampleEvery: "5m",
  token: { symbol: "TEST", supply: "1000000000" },
  market: {
    kind: "cpmm",
    quote: "500000 MON",
    base: "50000000000",
    feeBps: "5%",
  },
  mechanics: [{ kind: "feeBuyback", interval: "10s", feeShareBps: 10_000 }],
  actors: [
    { group: "retail", count: 500, spend: "100-1000 MON", over: "6h" },
    { group: "panicSeller", count: 280, holdings: "1000000-5000000", triggerDrawdown: "15%" },
    { group: "whale", spend: "80000 MON", at: "2h", sellAtX: 1.05 },
  ],
  checks: [{ kind: "maxDrawdownBelow", bps: 2000, window: "1h" }],
};

export default scenario;
