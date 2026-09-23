# 03 — Actors

Actors are simulated market participants. Each is a small, deterministic decision function: given the current market view, its own wallet, and the seeded RNG, it returns zero or more orders.

```ts
interface ActorContext {
  slot: Slot;
  market: MarketView; // read-only: price, reserves, recent trades
  wallet: WalletView; // own quote + base balances, entry price
  rng: Rng; // per-actor stream derived from scenario seed + actor id
}
```

Rules for every actor:

- **Pure.** Output depends only on `ctx`. No hidden globals.
- **Own RNG stream.** Derived as `rng.fork(actor.id)`, so adding an actor does not change the random draws of existing actors.
- **Bounded.** An actor never spends more than its configured budget and never sells more than it holds.
- **Explainable.** Every order carries a `reason` string (e.g. `"take-profit 3x"`) that appears in the trade log.

## v1 actor catalog

| Group         | Behavior                                                                                        | Key params                                                                         | Defaults                                                       |
| ------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `retail`      | Arrive spread over a window, buy once, hold; some sell on profit or loss                        | `count`, `spend` range, `over`, `takeProfitX`, `stopLossPct`, `sellProbabilityBps` | arrive uniformly over window; 30% sell at 2x; 20% sell at -50% |
| `sniper`      | Buy in the first slot(s) with high priority fee; sell after a short hold or at a multiple       | `count`, `spend`, `at`, `priorityFee`, `holdSlots`, `sellAtX`                      | slot 0; sell at 2x or after 150 slots (~1 min)                 |
| `bundler`     | N linked wallets buying in the same slot as creation, funded from one source; sells in tranches | `wallets`, `totalSpend`, `trancheBps`, `sellEvery`                                 | 10 wallets, 20% tranches every 10 min                          |
| `whale`       | One large buy at a set time; sells all at a multiple or on a trigger                            | `spend`, `at`, `sellAtX`                                                           | at 30 min; sell at 3x                                          |
| `panicSeller` | Holders who sell everything when drawdown from peak exceeds a threshold                         | `count`, `holdings` range, `triggerDrawdown`                                       | 30% drawdown                                                   |
| `flipper`     | Repeated small buy/sell cycles chasing short momentum                                           | `count`, `spend`, `cycleEvery`, `momentumWindow`                                   | every 5 min, 3-sample momentum                                 |

Group labels matter: checks like `groupSupplyShareBelow` aggregate by group, and the bundler group is also exposed as "linked wallets" in the report.

## Ordering within a slot

Orders are sorted by `priorityFee` descending, then by deterministic sequence. Snipers default to a high priority fee, which reproduces "snipers land in block 0 ahead of everyone".

## Honesty about realism

v1 actors are **stylized**, not calibrated. The report must say so in its "What was simulated" section:

> Actors are rule-based approximations. They are not calibrated against real mainnet wallets in this version. Real snipers and bundlers adapt; results show how the mechanism responds to these specific behaviors, not a prediction of real outcomes.

## Calibration roadmap (post-MVP)

1. **Replay mode.** Pull the first N minutes of real launches (trade log per wallet) and replay them against a modified mechanism ("what if this launch had used a 2-minute decaying fee?").
2. **Fitted actors.** Fit actor parameters (entry timing, spend distribution, hold time) to clusters of real wallets. Store fitted profiles as versioned JSON in `adapters/profiles/`.
3. **Profile provenance.** Each report lists which profile version was used.

## Testing actors (see docs/07)

- Unit tests per actor: given a crafted `ActorContext`, assert the exact orders.
- Property tests: never exceeds budget, never sells more than held, same ctx + seed → same orders.
- Scenario-level tests: e.g. "5 snipers at slot 0 on a default curve capture > X% of supply" pinned with a seed.
