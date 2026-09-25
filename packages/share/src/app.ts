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

function renderReportsIndexUnavailablePage(): string {
  return `<!doctype html><html><head><title>launchsim reports</title></head><body>
<h1>Reports</h1>
<p>This deployment's report index is not configured.</p>
</body></html>`;
}

function renderReportsListPage(reports: readonly IndexedReport[]): string {
  const rows =
    reports.length === 0
      ? "<p>No reports recorded yet.</p>"
      : `<ul>${reports
          .map(
            (r) => `<li>
  <a href="/r/${escapeHtml(r.id)}">${escapeHtml(r.id)}</a>
  &middot; ${String(r.checksPassed)}/${String(r.checksTotal)} checks passed
  &middot; submitted by ${escapeHtml(r.submitter)}
  &middot; <a href="https://testnet.monadscan.com/tx/${escapeHtml(r.transactionHash)}">tx</a>
</li>`,
          )
          .join("")}</ul>`;
  return `<!doctype html><html><head><title>launchsim reports</title></head><body>
<h1>Reports recorded on Monad</h1>
<p>Recording proves a report hasn't changed since it was published and who published it. It says nothing about whether a token is safe.</p>
${rows}
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
