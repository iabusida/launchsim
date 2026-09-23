import type { RunResult } from "./run-result.js";
import { escapeHtml } from "./escape-html.js";
import { formatQuoteAmount, type QuoteUnit } from "./format/format-quote-amount.js";
import { downsample } from "./chart/downsample.js";
import { renderLineChart } from "./chart/render-line-chart.js";
import { summarizeGroups } from "./group-summary.js";

const CHART_WIDTH = 600;
const CHART_HEIGHT = 200;
const MAX_CHART_POINTS = 600;

/** {@link renderHtmlReport}'s options. */
export interface HtmlReportOptions {
  /** The exact command that reproduces this run, shown in the "Reproduce" section. */
  readonly command: string;
  /** The scenario's quote asset, e.g. `{ symbol: "MON", decimals: 18 }` (docs/06). */
  readonly quoteUnit: QuoteUnit;
}

function renderChecksSection(result: RunResult): string {
  const items = result.checks
    .map(
      (check) =>
        `<li class="${check.passed ? "pass" : "fail"}">${check.passed ? "✓" : "✗"} ${escapeHtml(check.summary)}</li>`,
    )
    .join("");
  return `<section><h2>Checks</h2><ul class="checks">${items}</ul></section>`;
}

function renderChartsSection(result: RunResult): string {
  const quotePoints = downsample(
    result.timeline.samples.map((sample) => ({ x: sample.slot, y: Number(sample.quoteReserve) })),
    MAX_CHART_POINTS,
  );
  const quoteSvg = renderLineChart(quotePoints, {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    strokeColor: "var(--chart-line)",
  });
  return `<section><h2>Pool quote reserve over time</h2>${quoteSvg}</section>`;
}

function renderGroupsSection(result: RunResult, quoteUnit: QuoteUnit): string {
  const groups = summarizeGroups(result.trades);
  const rows = groups
    .map((group) => {
      const spent = formatQuoteAmount(group.spent, quoteUnit);
      const received = formatQuoteAmount(group.received, quoteUnit);
      const pnl =
        group.pnl >= 0n
          ? formatQuoteAmount(group.pnl, quoteUnit)
          : `-${formatQuoteAmount(-group.pnl, quoteUnit)}`;
      return `<tr><td>${escapeHtml(group.group)}</td><td>${spent}</td><td>${received}</td><td>${pnl}</td></tr>`;
    })
    .join("");
  return `<section><h2>Who profited</h2><table><thead><tr><th>Group</th><th>Spent</th><th>Received</th><th>PnL</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

function renderListSection(title: string, items: readonly string[]): string {
  const lis = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<section><h2>${escapeHtml(title)}</h2><ul>${lis}</ul></section>`;
}

/**
 * Renders a `RunResult` as a self-contained HTML report (docs/04): one
 * `index.html`, inline SVG charts, no external scripts, fonts, or CDNs.
 * Every user-provided string is escaped (docs/10). The "what was
 * simulated / not" section is always present, and the report never
 * claims a launch is safe, audited, or rug-proof (docs/08 golden rule 9,
 * docs/09).
 */
export function renderHtmlReport(result: RunResult, opts: HtmlReportOptions): string {
  const badge = result.passed ? "PASS" : "FAIL";
  const header = `
    <header>
      <h1>${escapeHtml(result.scenario.name)}</h1>
      <p class="badge ${result.passed ? "pass" : "fail"}">${badge}</p>
      <p>seed ${String(result.scenario.seed)} &middot; ${escapeHtml(result.mode)} mode &middot; launchsim ${escapeHtml(result.tool.version)} &middot; ${escapeHtml(result.scenario.hash)}</p>
    </header>`;

  const reproduce = `
    <section>
      <h2>Reproduce</h2>
      <pre>${escapeHtml(opts.command)}</pre>
      <p>Scenario hash: ${escapeHtml(result.scenario.hash)}</p>
    </section>`;

  const footer = `
    <footer>
      <p>This report shows how one mechanism behaved against specific simulated behaviors. It is not an audit, not a guarantee, and not financial advice.</p>
    </footer>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(result.scenario.name)} — launchsim report</title>
<style>
  :root { --chart-line: #2563eb; --bg: #ffffff; --fg: #111111; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --chart-line: #60a5fa; --bg: #0b0b0b; --fg: #eeeeee; } }
  :root[data-theme="dark"] { --chart-line: #60a5fa; --bg: #0b0b0b; --fg: #eeeeee; }
  body { background: var(--bg); color: var(--fg); font-family: system-ui, sans-serif; margin: 0 auto; max-width: 720px; padding: 16px; }
  .badge.pass { color: green; } .badge.fail { color: crimson; }
  .checks .pass { color: green; } .checks .fail { color: crimson; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid currentColor; padding: 4px 8px; text-align: left; }
</style>
</head>
<body>
${header}
<main>
${renderChecksSection(result)}
${renderChartsSection(result)}
${renderGroupsSection(result, opts.quoteUnit)}
${renderListSection("What was simulated", result.simulated)}
${renderListSection("What was not simulated", result.notSimulated)}
${reproduce}
</main>
${footer}
</body>
</html>`;
}
