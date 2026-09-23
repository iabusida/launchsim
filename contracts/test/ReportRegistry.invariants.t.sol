// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ReportRegistry} from "../src/ReportRegistry.sol";
import {IReportRegistry} from "../src/IReportRegistry.sol";
import {ReportRegistryHandler} from "./handlers/ReportRegistryHandler.sol";

/// @notice docs/07: "stateful invariant tests with a handler contract for
/// any state that must never change or must only grow." A recorded
/// record must never change, and `isRecorded` must never go true -> false
/// (ADR 0007: write-once).
contract ReportRegistryInvariantsTest is Test {
    ReportRegistry internal registry;
    ReportRegistryHandler internal handler;

    function setUp() public {
        registry = new ReportRegistry();
        handler = new ReportRegistryHandler(registry);
        targetContract(address(handler));
    }

    function invariant_IsRecordedNeverGoesFalseOnceTrue() public view {
        uint256 count = handler.recordedHashesCount();
        for (uint256 i = 0; i < count; i++) {
            assertTrue(registry.isRecorded(handler.recordedHashes(i)));
        }
    }

    function invariant_ARecordedRecordNeverChanges() public view {
        uint256 count = handler.recordedHashesCount();
        for (uint256 i = 0; i < count; i++) {
            bytes32 reportHash = handler.recordedHashes(i);
            IReportRegistry.Record memory expected = handler.recordedAs(reportHash);
            IReportRegistry.Record memory actual = registry.getRecord(reportHash);
            assertEq(actual.submitter, expected.submitter);
            assertEq(actual.recordedAt, expected.recordedAt);
            assertEq(actual.scenarioHash, expected.scenarioHash);
            assertEq(actual.checksPassed, expected.checksPassed);
            assertEq(actual.checksTotal, expected.checksTotal);
            assertEq(actual.toolVersion, expected.toolVersion);
            assertEq(actual.uri, expected.uri);
        }
    }
}
