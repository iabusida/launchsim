import { indexer, type Report } from "envio";

indexer.onEvent(
  {
    contract: "ReportRegistry",
    event: "ReportRecorded",
    fields: { transaction: ["hash"], block: ["timestamp"] },
  },
  async ({ event, context }) => {
    const report: Report = {
      id: event.params.reportHash,
      submitter: event.params.submitter,
      scenarioHash: event.params.scenarioHash,
      // uint16 on-chain; decoded as bigint, well within Int32 range.
      checksPassed: Number(event.params.checksPassed),
      checksTotal: Number(event.params.checksTotal),
      toolVersion: event.params.toolVersion,
      uri: event.params.uri,
      recordedAtBlock: BigInt(event.block.number),
      recordedAtTimestamp: BigInt(event.block.timestamp),
      transactionHash: event.transaction.hash,
    };
    context.Report.set(report);
  },
);
