import type { Address, Hex, PublicClient } from "viem";
import { reportRegistryAbi } from "./abi.js";

/** A recorded report, read back from the chain (docs/12). */
export interface ReportRecord {
  readonly submitter: Address;
  readonly recordedAt: bigint;
  readonly scenarioHash: Hex;
  readonly checksPassed: number;
  readonly checksTotal: number;
  readonly toolVersion: string;
  readonly uri: string;
}

const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

/**
 * Reads `reportHash`'s record from `registryAddress`, or `null` if it
 * hasn't been recorded (docs/12: the share page's three panel states --
 * recorded, not recorded, mismatch -- start here).
 */
export async function readRecord(
  client: PublicClient,
  registryAddress: Address,
  reportHash: Hex,
): Promise<ReportRecord | null> {
  const record = await client.readContract({
    address: registryAddress,
    abi: reportRegistryAbi,
    functionName: "getRecord",
    args: [reportHash],
  });
  if (record.submitter === ZERO_ADDRESS) {
    return null;
  }
  return record;
}
