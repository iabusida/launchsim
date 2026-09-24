import type { ScenarioConfigInput } from "@launchsim/core";

/**
 * launchsim isn't only for the first minutes of a token's life. This
 * scenario starts from an already-graduated, already-trading pool (a
 * `math/cpmm` pool with real reserves, not a fresh bonding curve) with
 * steady retail volume and a base of existing holders, then asks: what
 * happens if a large holder dumps into that pool? Pair with
 * `whale-exit-with-buyback.ts` (identical actors, identical seed) to see
 * whether an already-running fee-funded buyback would have absorbed the
 * shock.
 *
 * No mechanic runs here: nothing buys back into the dip, so the whale's
 * exit and the panic-selling it triggers pass straight through to price.
 * Measured worst 1h drawdown at this seed: 20.70% (fails the 20% limit).
 * With the buyback running (same seed, same actors): 19.86% (passes) --
 * a real but modest reduction, not manufactured to be dramatic; the fee
 * revenue a single pool generates in a few hours is genuinely limited
 * relative to a whale-sized exit, and the report should say so honestly
 * rather than oversell the mechanic.
 */
const scenario: ScenarioConfigInput = {
  schemaVersion: 1,
  name: "whale exit, mature pool, unprotected",
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
  mechanics: [],
  actors: [
    { group: "retail", count: 500, spend: "100-1000 MON", over: "6h" },
    { group: "panicSeller", count: 280, holdings: "1000000-5000000", triggerDrawdown: "15%" },
    { group: "whale", spend: "80000 MON", at: "2h", sellAtX: 1.05 },
  ],
  checks: [{ kind: "maxDrawdownBelow", bps: 2000, window: "1h" }],
};

export default scenario;
