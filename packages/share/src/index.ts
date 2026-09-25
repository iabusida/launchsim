/**
 * @packageDocumentation
 * `@launchsim/share`: the Hono app serving `/r/:id`, `/r/:id/result.json`,
 * `/badge/:id.png`, and `/reports` (docs/12).
 */
export { createApp } from "./app.js";
export type { CreateAppOptions } from "./app.js";
export { createFsReportStore, createInMemoryReportStore } from "./report-store.js";
export type { ReportStore } from "./report-store.js";
export { renderBadgeSvg, renderBadgePng } from "./badge.js";
export { createEnvioReportsIndexClient, createInMemoryReportsIndexClient } from "./reports-index.js";
export type { IndexedReport, ReportsIndexClient } from "./reports-index.js";
