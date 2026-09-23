export { formatLamports } from "./format/format-lamports.js";
export { formatBps } from "./format/format-bps.js";

export { toCanonicalJson } from "./canonical-json.js";
export { hashScenario } from "./hash-scenario.js";
export { escapeHtml } from "./escape-html.js";

export { buildRunResult } from "./run-result.js";
export type {
  RunResult,
  RunResultTool,
  RunResultScenario,
  RunResultMarket,
  BuildRunResultInput,
} from "./run-result.js";

export { summarizeGroups } from "./group-summary.js";
export type { GroupSummary } from "./group-summary.js";

export { renderTerminalReport, exitCodeForResult } from "./terminal-report.js";
export { renderHtmlReport } from "./html-report.js";
export type { HtmlReportOptions } from "./html-report.js";

export { downsample } from "./chart/downsample.js";
export type { ChartPoint } from "./chart/downsample.js";
export { renderLineChart } from "./chart/render-line-chart.js";
export type { LineChartOptions } from "./chart/render-line-chart.js";
