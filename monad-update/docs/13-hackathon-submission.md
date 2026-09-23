# 13 — Monad Metropolis submission

- **Submission deadline:** Oct 13, 2026 (judging Oct 14–27, winners Nov 3)
- **Track:** Trust/Identity & AI Infrastructure (backup: Onchain Finance & Trading)
- **Also check:** sponsor bounties (Nansen for wallet labels to calibrate actors; others as listed on the hackathon site)
- Confirm current rules, required deliverables, and the exact cutoff time on the official hackathon page. This doc is a checklist, not the rules.

## What judges should see in 3 minutes

1. **The problem:** a launch can be bug-free and still fail — snipers, bundlers, and tokenomics that drain liquidity. Real example: the founder's hourly LP-burn ERC-20.
2. **The demo:** one command runs the LP-burn scenario on a Nad.fun-style curve → ✗ pool drains. Same launch with fee-funded buyback → ✓ holds. Charts side by side.
3. **The trust layer:** the report is recorded on Monad; the share page shows "Recorded on Monad · hash matches". Edit one byte of the report → "Mismatch".
4. **Why it matters for Monad:** Nad.fun and future Monad launchpads can crash-test mechanics and publish tamper-evident results. Bundler tooling already targets Nad.fun.
5. **What's next:** Anvil-fork runs against Nad.fun's real contracts, replay-calibrated actors, AI red-team, Solana/Blink.

## Deliverables checklist

- [ ] Public GitHub repo (org account), README with GIF, Apache-2.0
- [ ] `ReportRegistry` deployed on Monad (address in README), source verified on the explorer
- [ ] Hosted share page with two live reports (fail + pass), both recorded on-chain
- [ ] Demo video (2–3 min): problem → run → reports → on-chain record → tamper check
- [ ] Pitch/description text for the submission form
- [ ] Test evidence: CI badge, coverage summary (100%), `forge coverage` output
- [ ] Honest limits section: math mode, stylized actors, what's not simulated
- [ ] Disclosure: repo started Sep 22, 2026, during the build window

## Evidence that raises the score

- A reply or quote from a launchpad team (Nad.fun or others) about how they test today, or interest in using this.
- A short thread with a real Nad.fun launch where snipers/bundles are visible on-chain, as motivation (link to on-chain data; no accusations against named people).
- Numbers from the simulations (e.g. "5 block-0 snipers captured 34% of supply under default fees; a 2-minute decaying fee cut it to 9%").

## Don't

- Claim any token is safe, audited, or rug-proof.
- Show fabricated metrics or user counts.
- Ship a buy button.
