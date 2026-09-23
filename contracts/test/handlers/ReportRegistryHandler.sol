// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ReportRegistry} from "../../src/ReportRegistry.sol";
import {IReportRegistry} from "../../src/IReportRegistry.sol";

/// @notice Drives {ReportRegistry} with bounded, always-valid `record` calls
/// for `invariant_` tests (docs/07): tracks every hash it has successfully
/// recorded, and what it recorded, so the invariant test can assert those
/// records never change and are never un-recorded.
contract ReportRegistryHandler is Test {
    ReportRegistry public immutable registry;

    bytes32[] public recordedHashes;
    mapping(bytes32 reportHash => IReportRegistry.Record) private _recordedAs;

    constructor(ReportRegistry registry_) {
        registry = registry_;
    }

    function recordedHashesCount() external view returns (uint256) {
        return recordedHashes.length;
    }

    function recordedAs(bytes32 reportHash) external view returns (IReportRegistry.Record memory) {
        return _recordedAs[reportHash];
    }

    function record(
        bytes32 reportHash,
        bytes32 scenarioHash,
        uint16 checksPassed,
        uint16 checksTotal,
        address submitter
    ) external {
        reportHash = keccak256(abi.encode("report", reportHash));
        scenarioHash = keccak256(abi.encode("scenario", scenarioHash));
        checksTotal = uint16(bound(checksTotal, 1, type(uint16).max));
        checksPassed = uint16(bound(checksPassed, 0, checksTotal));
        vm.assume(submitter != address(0));

        if (registry.isRecorded(reportHash)) {
            return; // already recorded elsewhere in this run; skip rather than expect a revert
        }

        vm.prank(submitter);
        registry.record(
            reportHash, scenarioHash, checksPassed, checksTotal, "0.1.0", "https://example.com"
        );

        recordedHashes.push(reportHash);
        _recordedAs[reportHash] = IReportRegistry.Record({
            submitter: submitter,
            recordedAt: uint64(block.timestamp),
            scenarioHash: scenarioHash,
            checksPassed: checksPassed,
            checksTotal: checksTotal,
            toolVersion: "0.1.0",
            uri: "https://example.com"
        });
    }
}
