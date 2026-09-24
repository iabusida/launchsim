/**
 * `ReportRegistry`'s ABI (docs/12), copied from `contracts/out/ReportRegistry.sol/ReportRegistry.json`
 * at the time this file was last updated. `abi.drift.test.ts` fails if this
 * copy and the compiled artifact ever diverge, so a contract change that
 * isn't reflected here fails loudly instead of shipping a stale client.
 */
export const reportRegistryAbi = [
  {
    type: "function",
    name: "getRecord",
    inputs: [{ name: "reportHash", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct IReportRegistry.Record",
        components: [
          { name: "submitter", type: "address", internalType: "address" },
          { name: "recordedAt", type: "uint64", internalType: "uint64" },
          { name: "scenarioHash", type: "bytes32", internalType: "bytes32" },
          { name: "checksPassed", type: "uint16", internalType: "uint16" },
          { name: "checksTotal", type: "uint16", internalType: "uint16" },
          { name: "toolVersion", type: "string", internalType: "string" },
          { name: "uri", type: "string", internalType: "string" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isRecorded",
    inputs: [{ name: "reportHash", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "record",
    inputs: [
      { name: "reportHash", type: "bytes32", internalType: "bytes32" },
      { name: "scenarioHash", type: "bytes32", internalType: "bytes32" },
      { name: "checksPassed", type: "uint16", internalType: "uint16" },
      { name: "checksTotal", type: "uint16", internalType: "uint16" },
      { name: "toolVersion", type: "string", internalType: "string" },
      { name: "uri", type: "string", internalType: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "ReportRecorded",
    inputs: [
      { name: "reportHash", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "submitter", type: "address", indexed: true, internalType: "address" },
      { name: "scenarioHash", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "checksPassed", type: "uint16", indexed: false, internalType: "uint16" },
      { name: "checksTotal", type: "uint16", indexed: false, internalType: "uint16" },
      { name: "toolVersion", type: "string", indexed: false, internalType: "string" },
      { name: "uri", type: "string", indexed: false, internalType: "string" },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "AlreadyRecorded",
    inputs: [{ name: "reportHash", type: "bytes32", internalType: "bytes32" }],
  },
  {
    type: "error",
    name: "InvalidChecks",
    inputs: [
      { name: "checksPassed", type: "uint16", internalType: "uint16" },
      { name: "checksTotal", type: "uint16", internalType: "uint16" },
    ],
  },
  {
    type: "error",
    name: "ToolVersionTooLong",
    inputs: [{ name: "length", type: "uint256", internalType: "uint256" }],
  },
  {
    type: "error",
    name: "UriTooLong",
    inputs: [{ name: "length", type: "uint256", internalType: "uint256" }],
  },
  { type: "error", name: "ZeroHash", inputs: [] },
] as const;
