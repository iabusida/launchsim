/**
 * One report as mirrored by `indexer/` (Envio HyperIndex) from
 * `ReportRegistry.ReportRecorded` -- lets `/reports` list every report
 * ever recorded without a caller needing to already know its hash
 * (docs/12).
 */
export interface IndexedReport {
  readonly id: string;
  readonly submitter: string;
  readonly scenarioHash: string;
  readonly checksPassed: number;
  readonly checksTotal: number;
  readonly toolVersion: string;
  readonly uri: string;
  readonly recordedAtBlock: bigint;
  readonly recordedAtTimestamp: bigint;
  readonly transactionHash: string;
}

/** Where the `/reports` browse page reads the indexed report list from. */
export interface ReportsIndexClient {
  listReports(opts?: { readonly limit?: number }): Promise<readonly IndexedReport[]>;
}

/**
 * Descending by recording time. A named, directly-testable function
 * rather than an inline comparator -- `Array.prototype.sort`'s call order
 * for a given input is engine-defined, so a black-box test through
 * `.sort()` can't reliably exercise both branches of an inline one.
 */
export function byRecordedAtDescending(a: IndexedReport, b: IndexedReport): number {
  return a.recordedAtTimestamp < b.recordedAtTimestamp ? 1 : -1;
}

/** An in-memory fake for tests (docs/07: "fakes only at I/O boundaries"). */
export function createInMemoryReportsIndexClient(reports: readonly IndexedReport[]): ReportsIndexClient {
  return {
    listReports(opts) {
      const sorted = [...reports].sort(byRecordedAtDescending);
      const limited = opts?.limit === undefined ? sorted : sorted.slice(0, opts.limit);
      return Promise.resolve(limited);
    },
  };
}

interface GraphQlReportRow {
  readonly id: string;
  readonly submitter: string;
  readonly scenarioHash: string;
  readonly checksPassed: number;
  readonly checksTotal: number;
  readonly toolVersion: string;
  readonly uri: string;
  readonly recordedAtBlock: string;
  readonly recordedAtTimestamp: string;
  readonly transactionHash: string;
}

interface GraphQlResponse {
  readonly data?: { readonly Report: readonly GraphQlReportRow[] };
  readonly errors?: readonly { readonly message: string }[];
}

const DEFAULT_LIMIT = 50;

/**
 * Queries `indexer/`'s generated GraphQL API directly (no library beyond
 * `fetch`, matching docs/08's dependency discipline). `checksPassed` and
 * `checksTotal` come back as plain GraphQL `Int`s; `recordedAtBlock` and
 * `recordedAtTimestamp` are `BigInt`s and travel as strings over JSON, so
 * they're parsed back to `bigint` here.
 */
export function createEnvioReportsIndexClient(graphqlUrl: string): ReportsIndexClient {
  return {
    async listReports(opts) {
      const limit = opts?.limit ?? DEFAULT_LIMIT;
      const query = `query ListReports {
  Report(limit: ${String(limit)}, order_by: { recordedAtTimestamp: desc }) {
    id
    submitter
    scenarioHash
    checksPassed
    checksTotal
    toolVersion
    uri
    recordedAtBlock
    recordedAtTimestamp
    transactionHash
  }
}`;
      const res = await fetch(graphqlUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) {
        throw new Error(`createEnvioReportsIndexClient: indexer responded ${String(res.status)}`);
      }
      const body = (await res.json()) as GraphQlResponse;
      if (body.errors && body.errors.length > 0) {
        throw new Error(`createEnvioReportsIndexClient: ${body.errors.map((e) => e.message).join("; ")}`);
      }
      const rows = body.data?.Report ?? [];
      return rows.map((row) => ({
        ...row,
        recordedAtBlock: BigInt(row.recordedAtBlock),
        recordedAtTimestamp: BigInt(row.recordedAtTimestamp),
      }));
    },
  };
}
