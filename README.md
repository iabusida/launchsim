# launchsim

**Crash-test your Solana token launch against snipers, bundlers, and bad tokenomics before real money does.**

> Status: pre-alpha, MVP in progress. Working name; may change.

launchsim runs your launch setup (a pump-style bonding curve or an AMM pool, plus mechanics like burns or buybacks) inside a simulated market full of scripted traders. You get pass/fail checks, a JSON result, a shareable HTML report, and a Solana Blink so anyone can see the result from a link on X.

```ts
import { scenario, actors, expect } from "@launchsim/core";

export default scenario("hourly burn from LP", ({ token, pool, clock }) => {
  token.launch({ market: "pump-curve", mechanics: [lpBurn({ perHour: ["5%", "4%", "3%", "1%"] })] });

  actors.snipers({ count: 5, spend: "2 SOL", at: "slot:0" });
  actors.retail({ count: 300, spend: "0.1-1 SOL", over: "6h" });
  actors.whale({ spend: "50 SOL", sellAt: "3x" });

  clock.run("48h");

  expect(pool.quote).neverBelow("50% of peak");
  expect(actors.snipers.supplyShare("1m")).below("10%");
});
```

```
$ npx launchsim run scenarios/hourly-burn-lp.ts
✗ hourly burn from LP   (seed 42, math mode, launchsim 0.1.0)
  ✗ pool SOL fell to 18% of peak at hour 31
  ✗ snipers held 34% of supply after 1 min
  report → ./launchsim-report/index.html
```

## What it is not

- Not an audit. A passing report means the listed scenarios passed, nothing more.
- Not a trading bot or sniper.
- Not financial advice.

## Docs

Start with [`CLAUDE.md`](./CLAUDE.md), then [`docs/`](./docs/README.md).

## License

Apache-2.0
