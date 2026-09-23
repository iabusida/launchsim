# 00 — Overview

## The problem

Testing whether smart-contract **code works** is well served: Foundry and Hardhat on EVM, LiteSVM, Mollusk and Surfpool on Solana. Testing what happens when **the market attacks** a launch is not.

A launch can be bug-free and still fail:

- **Snipers** buy in the first block and dump on retail.
- **Bundlers** use linked wallets to fake a crowd and hold hidden supply.
- **Tokenomics drain.** Example from the founder's own ERC-20 launch: an hourly burn taken straight from the liquidity pool (5% → 4% → 3% → 1% per hour) pushed the price up every hour while no new money entered the pool. Early sellers pulled out the quote asset at inflated prices; later sellers exited into a thinner and thinner pool.

None of that shows up in a unit test. It shows up after real money is lost.

## What launchsim does

1. Runs a launch setup inside a simulated market with scripted actors.
2. Evaluates checks that must hold.
3. Produces a deterministic `RunResult`, a terminal summary, and an HTML report.
4. Serves the report as a Solana Blink so it can travel on X and elsewhere.

## Users (in priority order)

1. **Launchpad builders.** They need their curve, fees, and anti-sniper settings to hold up before thousands of tokens launch on them. One integration reaches every token on the platform. **Primary target.**
2. **Serious token teams.** Projects with buybacks, burns, vesting, or reward mechanics that can break economically.
3. **Meme devs.** Many won't test, but some want the report as a public trust badge.
4. **Auditors and researchers** (later). Scenario files make economic failures reproducible.

Indirect beneficiary: **retail buyers**, who can read a report before buying.

## Scope for v1

- Solana only.
- Math mode (pure TypeScript market models) for pump-style curves and constant-product pools.
- Six actor types, three core checks, two mechanics (LP burn, fee-funded buyback-and-burn).
- CLI, HTML report, Blink endpoint.

## Non-goals (for now)

- A web IDE or playground (later phase).
- EVM support (later: Base and Robinhood Chain first).
- Auditing arbitrary program code for bugs.
- Running live trading strategies or sniping.
- Claiming any token is safe.

## Known neighbors

- **preflight** (GitHub): simulation and mechanism-design toolkit for Meteora Dynamic Bonding Curves. Closest prior art. launchsim differs by being launchpad-agnostic, adding replay-calibrated actors later, and producing a public report/Blink.
- **Gauntlet, Chaos Labs:** agent-based simulation for large DeFi lending protocols, sold as consulting.
- **Meteora Anti-Sniper Suite, Orca Wavebreak, Metaplex auctions:** launch-time protections. launchsim can *test* these rather than compete with them.

Before building a feature, check whether a neighbor already does it well. Prefer integrating or contributing over duplicating.

## Success criteria for the MVP spike

- Hourly-burn scenario fails the liquidity check; fee-funded buyback scenario passes it, from one command.
- Report page and Blink published for both runs.
- **Keep going** if at least one launchpad team asks to try it or asks how to integrate.
- **Rethink** if the demo gets likes but no launchpad replies.
