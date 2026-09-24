import type { RunResult } from "./run-result.js";

/**
 * `RunResult` as `JSON.parse` actually produces it: identical in shape,
 * except every field `toCanonicalJson` stringified a `bigint` into comes
 * back as a plain `string`, not the lie a direct `as RunResult` cast
 * would tell the type checker.
 */
type ParsedRunResultJson = Omit<RunResult, "timeline" | "mechanicEvents" | "trades"> & {
  readonly timeline: {
    readonly samples: readonly { readonly slot: number; readonly quoteReserve: string; readonly baseReserve: string }[];
    readonly peakQuoteReserve: string;
  };
  readonly mechanicEvents: readonly (Omit<RunResult["mechanicEvents"][number], "baseBurned" | "quoteSpent"> & {
    readonly baseBurned: string;
    readonly quoteSpent: string;
  })[];
  readonly trades: readonly (Omit<RunResult["trades"][number], "quote" | "base"> & {
    readonly quote: string;
    readonly base: string;
  })[];
};

/**
 * Parses a `RunResult`'s canonical JSON (from `toCanonicalJson`) back into
 * a `RunResult` with real `bigint`s -- the reverse direction `toCanonicalJson`
 * doesn't need, but a report store reading a saved `result.json` does.
 * `RunResult`'s bigint fields are at fixed, known locations (not generic),
 * so this reconstructs them by shape rather than guessing from string
 * content.
 *
 * @throws {SyntaxError} If `json` isn't valid JSON.
 */
export function parseRunResultJson(json: string): RunResult {
  const parsed = JSON.parse(json) as ParsedRunResultJson;
  return {
    ...parsed,
    timeline: {
      samples: parsed.timeline.samples.map((sample) => ({
        slot: sample.slot,
        quoteReserve: BigInt(sample.quoteReserve),
        baseReserve: BigInt(sample.baseReserve),
      })),
      peakQuoteReserve: BigInt(parsed.timeline.peakQuoteReserve),
    },
    mechanicEvents: parsed.mechanicEvents.map((event) => ({
      ...event,
      baseBurned: BigInt(event.baseBurned),
      quoteSpent: BigInt(event.quoteSpent),
    })),
    trades: parsed.trades.map((trade) => ({
      ...trade,
      quote: BigInt(trade.quote),
      base: BigInt(trade.base),
    })),
  };
}
