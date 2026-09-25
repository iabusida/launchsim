import type { ScenarioConfigInput } from "@launchsim/core";

/**
 * The AI red-team's target scenario (docs/09 Phase B): a launch that
 * *passes* `groupSupplyShareBelow` at its shipped sniper count, so
 * `red_team_scenario` (`@launchsim/mcp`) has something to search --
 * "how few snipers does it take to break this?"
 *
 * Same `nadfun-curve` market and retail actors as `hourly-burn-lp.ts` /
 * `fee-buyback.ts` (docs/06, ADR 0006), narrowed to a 10-minute window
 * so `groupSupplyShareBelow`'s `at: "1m"` lands inside the retail
 * buy-in window, not after it. The sniper's `holdSlots` is set well past
 * that 1-minute mark (the actor's own default is ~1 minute, i.e. sold
 * out right around the check point) so a scaled-up sniper group is
 * still holding when the check evaluates.
 *
 * `findSmallestBreak(config, 1, "groupSupplyShareBelow", { min: 1, max: 40 })`
 * finds 5: at 4 snipers or fewer, their combined buy is too small a
 * share of the (still-filling-in) retail total to round above 0% in the
 * first minute; at 5, they hold just over 10%. The relationship isn't
 * monotonic past that (6 measures lower than 5) -- documented in
 * `findSmallestBreak`'s own TSDoc as the reason it's a full linear scan,
 * not a binary search: a binary search would have wrongly concluded 6
 * was "safer" than 5 and stopped looking.
 */
const scenario: ScenarioConfigInput = {
  schemaVersion: 1,
  name: "sniper supply share",
  seed: 1,
  duration: "10m",
  sampleEvery: "1m",
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
  actors: [
    { group: "retail", count: 300, spend: "0.1-1 MON", over: "6m" },
    { group: "sniper", count: 1, spend: "1-3 MON", at: "slot:0", holdSlots: 5000 },
  ],
  checks: [{ kind: "groupSupplyShareBelow", group: "sniper", at: "1m", bps: 1000 }],
};

export default scenario;
