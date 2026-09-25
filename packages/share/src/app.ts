import { Hono } from "hono";
import type { Address, PublicClient } from "viem";
import { escapeHtml, renderHtmlReport, toCanonicalJson, type RunResult } from "@launchsim/report";
import { getChainRecordPanel, type ChainRecordPanel } from "@launchsim/registry";
import type { ReportStore } from "./report-store.js";
import { renderBadgePng } from "./badge.js";
import type { IndexedReport, ReportsIndexClient } from "./reports-index.js";

/** {@link createApp}'s options. */
export interface CreateAppOptions {
  readonly store: ReportStore;
  readonly client: PublicClient;
  readonly registryAddress: Address;
  /** Absolute origin used to build the `og:image` URL, e.g. `https://launchsim.example`. */
  readonly baseUrl: string;
  /**
   * Backs `/reports` (docs/12): lists every report the `indexer/` Envio
   * project has indexed from `ReportRecorded`. Omit it on a deployment
   * that hasn't stood up the indexer yet -- `/reports` then says so
   * honestly instead of pretending an empty list is the whole history.
   */
  readonly reportsIndex?: ReportsIndexClient;
}

/** Same theme as `@launchsim/report`'s `renderHtmlReport`, so `/reports` reads as part of the same product, not a bolted-on page. */
const REPORTS_PAGE_STYLE = `<style>
  :root { --bg: #ffffff; --fg: #111111; --dim: #6b7280; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #0b0b0b; --fg: #eeeeee; --dim: #9ca3af; } }
  :root[data-theme="dark"] { --bg: #0b0b0b; --fg: #eeeeee; --dim: #9ca3af; }
  body { background: var(--bg); color: var(--fg); font-family: system-ui, sans-serif; margin: 0 auto; max-width: 720px; padding: 16px; }
  .dim { color: var(--dim); }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 0.85em; }
  .badge.pass { color: green; border: 1px solid green; } .badge.fail { color: crimson; border: 1px solid crimson; }
  table { border-collapse: collapse; width: 100%; margin-top: 16px; }
  td, th { border: 1px solid currentColor; padding: 6px 10px; text-align: left; }
  a { color: inherit; }
  code { font-size: 0.9em; }
</style>`;

function renderReportsIndexUnavailablePage(): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>launchsim reports</title>${REPORTS_PAGE_STYLE}</head>
<body>
<h1>Reports recorded on Monad</h1>
<p class="dim">This deployment's report index is not configured.</p>
</body></html>`;
}

function renderReportsListPage(reports: readonly IndexedReport[]): string {
  const body =
    reports.length === 0
      ? '<p class="dim">No reports recorded yet.</p>'
      : `<table>
<thead><tr><th>Report</th><th>Result</th><th>Submitter</th><th>Tx</th></tr></thead>
<tbody>
${reports
  .map((r) => {
    const passed = r.checksTotal > 0 && r.checksPassed === r.checksTotal;
    return `<tr>
  <td><a href="/r/${escapeHtml(r.id)}"><code>${escapeHtml(r.id.slice(0, 18))}&hellip;</code></a></td>
  <td><span class="badge ${passed ? "pass" : "fail"}">${passed ? "PASS" : "FAIL"}</span> <span class="dim">${String(r.checksPassed)}/${String(r.checksTotal)} checks passed</span></td>
  <td class="dim"><code>${escapeHtml(r.submitter.slice(0, 10))}&hellip;</code></td>
  <td><a href="https://testnet.monadscan.com/tx/${escapeHtml(r.transactionHash)}">tx</a></td>
</tr>`;
  })
  .join("\n")}
</tbody>
</table>`;
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>launchsim reports</title>${REPORTS_PAGE_STYLE}</head>
<body>
<h1>Reports recorded on Monad</h1>
<p class="dim">Recording proves a report hasn't changed since it was published and who published it. It says nothing about whether a token is safe.</p>
${body}
</body></html>`;
}

const PANEL_COPY: Readonly<Record<ChainRecordPanel["status"], string>> = {
  recorded: "Recorded on Monad",
  "not-recorded": "Not recorded",
  mismatch: "Mismatch",
};

/**
 * Renders the chain record panel (docs/12). Wording never implies safety
 * -- recording proves integrity and authorship, not that a token is safe
 * (ADR 0007, docs/08 golden rule 9).
 */
function renderChainRecordPanel(panel: ChainRecordPanel): string {
  const lines = [`<section><h2>Chain record</h2><p>${PANEL_COPY[panel.status]}</p>`];
  if (panel.status === "recorded" && panel.record) {
    lines.push(
      `<p>Block time ${String(panel.record.recordedAt)} &middot; submitted by ${escapeHtml(panel.record.submitter)} &middot; ${String(panel.record.checksPassed)}/${String(panel.record.checksTotal)} checks passed &middot; hash matches</p>`,
    );
  } else if (panel.status === "not-recorded") {
    lines.push("<p>This report has not been recorded on-chain.</p>");
  } else {
    lines.push("<p>The stored report does not match any on-chain record.</p>");
  }
  lines.push(
    "<p>Recording proves this report hasn't changed since it was published and who published it. It says nothing about whether the token is safe.</p></section>",
  );
  return lines.join("");
}

function renderReportPage(result: RunResult, panel: ChainRecordPanel, runId: string, baseUrl: string): string {
  const html = renderHtmlReport(result, {
    command: `launchsim run <scenario> && launchsim publish ${runId}`,
    quoteUnit: {
      symbol: result.market.params["quoteSymbol"] ?? "MON",
      decimals: Number(result.market.params["quoteDecimals"] ?? "18"),
    },
  });
  const badgeUrl = `${baseUrl}/badge/${runId}.png`;
  const ogTags = `
<meta property="og:title" content="${escapeHtml(result.scenario.name)} — ${result.passed ? "PASS" : "FAIL"}" />
<meta property="og:image" content="${escapeHtml(badgeUrl)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="${escapeHtml(badgeUrl)}" />`;
  const panelHtml = renderChainRecordPanel(panel);
  return html.replace("</head>", `${ogTags}\n</head>`).replace("</main>", `${panelHtml}</main>`);
}

/** Builds the share page's Hono app (docs/12): `/r/:id`, `/r/:id/result.json`, `/badge/:id.png`. */
export function createApp(opts: CreateAppOptions): Hono {
  const app = new Hono();

  app.get("/r/:id/result.json", async (c) => {
    const result = await opts.store.get(c.req.param("id"));
    if (!result) {
      return c.json({ message: "not found" }, 404);
    }
    return c.body(toCanonicalJson(result), 200, { "Content-Type": "application/json" });
  });

  app.get("/badge/:id{.+\\.png}", async (c) => {
    const runId = c.req.param("id").replace(/\.png$/, "");
    const result = await opts.store.get(runId);
    if (!result) {
      return c.body("not found", 404);
    }
    return c.body(new Uint8Array(renderBadgePng(result)), 200, { "Content-Type": "image/png" });
  });

  app.get("/reports", async (c) => {
    if (!opts.reportsIndex) {
      return c.html(renderReportsIndexUnavailablePage());
    }
    const reports = await opts.reportsIndex.listReports();
    return c.html(renderReportsListPage(reports));
  });

  app.get("/r/:id", async (c) => {
    const runId = c.req.param("id");
    const result = await opts.store.get(runId);
    if (!result) {
      return c.text("not found", 404);
    }
    const panel = await getChainRecordPanel(result, opts.client, opts.registryAddress);
    return c.html(renderReportPage(result, panel, runId, opts.baseUrl));
  });

  return app;
}
