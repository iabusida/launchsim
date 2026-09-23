import { parseAmount, parseDecimalToBigInt, parsePercent, type ScenarioConfig } from "@launchsim/core";
import type { Market } from "@launchsim/core";
import { createCpmmMarket, createNadfunCurveMarket, createPumpCurveMarket } from "@launchsim/adapters";
import type { QuoteUnit } from "@launchsim/report";
import { quoteUnitFromAmount } from "./quote-unit.js";

/** A scenario's built {@link Market} plus the quote unit its report should display amounts in. */
export interface BuiltMarket {
  readonly market: Market;
  readonly quoteUnit: QuoteUnit;
}

/**
 * Builds a {@link Market} (docs/06) from a scenario's `market` config, and
 * derives the report's {@link QuoteUnit} from whichever quote amount string
 * the config used (`docs/06`'s adapters are chain-agnostic; the quote unit
 * is inferred, not a separate schema field).
 */
export function buildMarket(market: ScenarioConfig["market"]): BuiltMarket {
  if (market.kind === "pump-curve") {
    return {
      market: createPumpCurveMarket({
        virtualQuoteReserve: parseAmount(market.virtualQuote),
        virtualBaseReserve: parseDecimalToBigInt(market.virtualBase, 0),
        feeBps: parsePercent(market.feeBps),
        graduationQuoteThreshold: parseAmount(market.graduationQuote),
      }),
      quoteUnit: quoteUnitFromAmount(market.virtualQuote),
    };
  }
  if (market.kind === "nadfun-curve") {
    return {
      market: createNadfunCurveMarket({
        virtualMonReserve: parseAmount(market.virtualQuote),
        virtualTokenReserve: parseDecimalToBigInt(market.virtualBase, 0),
        feeBps: parsePercent(market.feeBps),
        graduationQuoteThreshold: parseAmount(market.graduationQuote),
      }),
      quoteUnit: quoteUnitFromAmount(market.virtualQuote),
    };
  }
  return {
    market: createCpmmMarket({
      quoteReserve: parseAmount(market.quote),
      baseReserve: parseDecimalToBigInt(market.base, 0),
      feeBps: parsePercent(market.feeBps),
    }),
    quoteUnit: quoteUnitFromAmount(market.quote),
  };
}
