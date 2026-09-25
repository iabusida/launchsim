import { describe, expect, it } from "vitest";
import { createTestIndexer } from "envio";
import "./EventHandlers.js";

const REPORT_HASH = "0x40aa14dd7eb317f8000000000000000000000000000000000000000000abcd";
const SUBMITTER = "0x6160951C000000000000000000000000000a9CFE" as const;
const SCENARIO_HASH = "0x1111111111111111111111111111111111111111111111111111111111ab";

describe("ReportRegistry.ReportRecorded handler", () => {
  it("creates a Report entity from the event, with checksPassed/checksTotal as numbers", async () => {
    const indexer = createTestIndexer();

    await indexer.process({
      chains: {
        10143: {
          simulate: [
            {
              contract: "ReportRegistry",
              event: "ReportRecorded",
              params: {
                reportHash: REPORT_HASH,
                submitter: SUBMITTER,
                scenarioHash: SCENARIO_HASH,
                checksPassed: 1,
                checksTotal: 1,
                toolVersion: "0.1.0",
                uri: "https://your-share-host/r/40aa14dd7eb317f8",
              },
              block: { timestamp: 1790300291 },
              transaction: {
                hash: "0xb3c9ea96f322b202da53dc4029772153c6a3843e2f1adaf5e191ddc02177eac2",
              },
            },
          ],
        },
      },
    });

    const report = await indexer.Report.getOrThrow(REPORT_HASH);

    expect(report.submitter).toBe(SUBMITTER);
    expect(report.scenarioHash).toBe(SCENARIO_HASH);
    expect(report.checksPassed).toBe(1);
    expect(report.checksTotal).toBe(1);
    expect(typeof report.checksPassed).toBe("number");
    expect(report.toolVersion).toBe("0.1.0");
    expect(report.uri).toBe("https://your-share-host/r/40aa14dd7eb317f8");
    expect(report.recordedAtTimestamp).toBe(1790300291n);
    expect(report.transactionHash).toBe(
      "0xb3c9ea96f322b202da53dc4029772153c6a3843e2f1adaf5e191ddc02177eac2",
    );
  });
});
