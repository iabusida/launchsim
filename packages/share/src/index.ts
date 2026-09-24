/**
 * @packageDocumentation
 * `@launchsim/share`: the Hono app serving `/r/:id`, `/r/:id/result.json`,
 * and `/badge/:id.png` (docs/12).
 */
export { createApp } from "./app.js";
export type { CreateAppOptions } from "./app.js";
export { createFsReportStore, createInMemoryReportStore } from "./report-store.js";
export type { ReportStore } from "./report-store.js";
export { getChainRecordPanel } from "./chain-record-panel.js";
export type { ChainRecordPanel, ChainRecordStatus } from "./chain-record-panel.js";
export { renderBadgeSvg, renderBadgePng } from "./badge.js";
