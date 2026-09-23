# Glossary

| Term                   | Meaning                                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Actor**              | A simulated market participant with a deterministic decision rule (retail, sniper, bundler, whale, panic seller, flipper).         |
| **Basis point (bp)**   | 0.01%. 10,000 bps = 100%. All percentage math uses bps.                                                                            |
| **Base / quote**       | Base = the launched token. Quote = what it is priced in (SOL in v1).                                                               |
| **Blink**              | A "blockchain link": a URL that unfurls as an interactive card in supporting clients, backed by a Solana Action.                   |
| **Bonding curve**      | A pricing formula where price rises as supply is bought; pump-style curves use constant product over virtual reserves.             |
| **Bundler**            | A group of linked wallets buying in the same slot as token creation, usually funded from one source, to hold hidden supply.        |
| **Canonical JSON**     | JSON with fixed key order and no wall-clock data, so identical inputs give byte-identical files.                                   |
| **Chain mode**         | Engine mode that executes real transactions against a local Surfpool/LiteSVM chain.                                                |
| **Check**              | A rule evaluated after a run (e.g. pool quote never below 50% of peak).                                                            |
| **CPMM**               | Constant-product market maker: `quote * base = k`.                                                                                 |
| **Fee-funded buyback** | Mechanic that spends accumulated trading fees to buy tokens from the pool and burn them. Adds quote to the pool.                   |
| **Graduation**         | When a bonding curve reaches its target and migrates liquidity to a DEX pool.                                                      |
| **LiteSVM**            | In-process Solana VM for fast program tests.                                                                                       |
| **LP burn**            | Mechanic that burns tokens directly out of the pool's base reserve. Raises price without adding quote; drains liquidity over time. |
| **Math mode**          | Engine mode that models markets in pure TypeScript. Fast and deterministic.                                                        |
| **Mechanic**           | A scheduled rule that changes the market outside of trades (burns, buybacks).                                                      |
| **Mutation testing**   | Automatically introducing small bugs to verify tests catch them (Stryker).                                                         |
| **Parity test**        | Runs the same scenario in math and chain mode and compares results.                                                                |
| **Permanent delegate** | Token-2022 extension letting an authority move or burn tokens from any account; flagged as high risk by scanners.                  |
| **RunResult**          | The versioned, deterministic output of one simulation run.                                                                         |
| **Scenario**           | A launch setup plus actors, duration, mechanics, and checks.                                                                       |
| **Slot**               | Solana's unit of time (~400 ms nominal); the engine's time unit.                                                                   |
| **Sniper**             | A bot that buys in the first slot(s) of a launch with a high priority fee, then sells quickly.                                     |
| **Surfpool**           | Local Solana network with copy-on-read mainnet fork and cheatcodes; Anchor 1.0's default local validator.                          |
| **TDD**                | Test-driven development: red (failing test) → green (minimal code) → refactor.                                                     |
