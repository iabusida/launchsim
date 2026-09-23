import type { ScenarioConfigInput } from "@launchsim/core";

/**
 * The founder's original ERC-20 mechanic (docs/00): every hour, burn a
 * shrinking share of the pool's base reserve directly, with no quote ever
 * entering the pool. Price rises on paper while liquidity in quote terms
 * never grows, so each seller drains a pool that isn't being refilled.
 * Pair with `fee-buyback.ts` (same actors, same seed) to see the fix.
 *
 * Retail only, deliberately: snipers and a whale dominate the "worst dip
 * from peak" metric with their own entry/exit regardless of which
 * mechanic is running, drowning out the mechanic's actual effect (found
 * by sweeping seeds while building the interpreter). Sniper-driven
 * failures belong in a dedicated `sniper-block0.ts`-style scenario
 * (docs/02's shipped-scenario table already separates them), not mixed
 * into this comparison.
 *
 * `docs/06`: rounding and reserve figures here are illustrative, not any
 * real launchpad's exact parameters.
 */
const scenario: ScenarioConfigInput = {
  schemaVersion: 1,
  name: "hourly burn from LP",
  seed: 1,
  duration: "48h",
  sampleEvery: "1h",
  token: {
    symbol: "TEST",
    supply: "1000000000",
  },
  market: {
    kind: "cpmm",
    quote: "30 MON",
    base: "1073000000000000",
    feeBps: "1%",
  },
  mechanics: [{ kind: "lpBurn", perHour: ["5%", "4%", "3%", "1%"], stepEvery: "24h" }],
  actors: [{ group: "retail", count: 300, spend: "0.1-1 MON", over: "6h" }],
  checks: [{ kind: "quoteNeverBelowPctOfPeak", bps: 5000 }],
};

export default scenario;
