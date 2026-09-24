/**
 * @packageDocumentation
 * `@launchsim/registry`: a viem client for `ReportRegistry` (docs/12).
 * Never holds or asks for a key -- it only hashes reports and encodes
 * calls; `cli publish` prints the encoded call for the human's own wallet.
 */
export { reportRegistryAbi } from "./abi.js";
export { toReportHash } from "./report-hash.js";
export { buildRecordCall } from "./build-record-call.js";
export type { RecordCall } from "./build-record-call.js";
export { readRecord } from "./read-record.js";
export type { ReportRecord } from "./read-record.js";
