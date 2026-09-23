// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ReportRegistry} from "../src/ReportRegistry.sol";
import {IReportRegistry} from "../src/IReportRegistry.sol";

contract ReportRegistryTest is Test {
    ReportRegistry internal registry;

    bytes32 internal constant REPORT_HASH = keccak256("report");
    bytes32 internal constant SCENARIO_HASH = keccak256("scenario");
    string internal constant TOOL_VERSION = "0.1.0";
    string internal constant URI = "https://example.com/r/abc123";

    function setUp() public {
        registry = new ReportRegistry();
    }

    // --- happy path ---

    function test_RecordEmitsTheExactEvent() public {
        vm.expectEmit(true, true, true, true);
        emit IReportRegistry.ReportRecorded(
            REPORT_HASH, address(this), SCENARIO_HASH, 2, 3, TOOL_VERSION, URI
        );
        registry.record(REPORT_HASH, SCENARIO_HASH, 2, 3, TOOL_VERSION, URI);
    }

    function test_RecordThenGetRecordReadsBackIdentically() public {
        registry.record(REPORT_HASH, SCENARIO_HASH, 2, 3, TOOL_VERSION, URI);
        IReportRegistry.Record memory got = registry.getRecord(REPORT_HASH);
        assertEq(got.submitter, address(this));
        assertEq(got.scenarioHash, SCENARIO_HASH);
        assertEq(got.checksPassed, 2);
        assertEq(got.checksTotal, 3);
        assertEq(got.toolVersion, TOOL_VERSION);
        assertEq(got.uri, URI);
        assertEq(got.recordedAt, uint64(block.timestamp));
    }

    function test_RecordThenIsRecordedIsTrue() public {
        registry.record(REPORT_HASH, SCENARIO_HASH, 2, 3, TOOL_VERSION, URI);
        assertTrue(registry.isRecorded(REPORT_HASH));
    }

    function test_IsRecordedIsFalseForAnUnrecordedHash() public view {
        assertFalse(registry.isRecorded(REPORT_HASH));
    }

    function test_GetRecordForAnUnrecordedHashReturnsTheZeroRecord() public view {
        IReportRegistry.Record memory got = registry.getRecord(REPORT_HASH);
        assertEq(got.submitter, address(0));
        assertEq(got.recordedAt, 0);
        assertEq(got.checksTotal, 0);
    }

    function test_ChecksPassedEqualToChecksTotalIsAllowed() public {
        registry.record(REPORT_HASH, SCENARIO_HASH, 3, 3, TOOL_VERSION, URI);
        assertEq(registry.getRecord(REPORT_HASH).checksPassed, 3);
    }

    function test_ChecksPassedZeroIsAllowed() public {
        registry.record(REPORT_HASH, SCENARIO_HASH, 0, 3, TOOL_VERSION, URI);
        assertEq(registry.getRecord(REPORT_HASH).checksPassed, 0);
    }

    function test_RecordedAtIsTheBlockTimestamp() public {
        vm.warp(12345);
        registry.record(REPORT_HASH, SCENARIO_HASH, 1, 1, TOOL_VERSION, URI);
        assertEq(registry.getRecord(REPORT_HASH).recordedAt, 12345);
    }

    function test_DifferentSubmittersCanEachRecordTheirOwnReport() public {
        registry.record(REPORT_HASH, SCENARIO_HASH, 1, 1, TOOL_VERSION, URI);
        bytes32 otherHash = keccak256("other report");
        vm.prank(address(0xBEEF));
        registry.record(otherHash, SCENARIO_HASH, 1, 1, TOOL_VERSION, URI);
        assertEq(registry.getRecord(otherHash).submitter, address(0xBEEF));
    }

    // --- revert paths ---

    function test_RevertWhen_AlreadyRecorded() public {
        registry.record(REPORT_HASH, SCENARIO_HASH, 1, 1, TOOL_VERSION, URI);
        vm.expectRevert(
            abi.encodeWithSelector(IReportRegistry.AlreadyRecorded.selector, REPORT_HASH)
        );
        registry.record(REPORT_HASH, SCENARIO_HASH, 1, 1, TOOL_VERSION, URI);
    }

    function test_RevertWhen_ReportHashIsZero() public {
        vm.expectRevert(IReportRegistry.ZeroHash.selector);
        registry.record(bytes32(0), SCENARIO_HASH, 1, 1, TOOL_VERSION, URI);
    }

    function test_RevertWhen_ScenarioHashIsZero() public {
        vm.expectRevert(IReportRegistry.ZeroHash.selector);
        registry.record(REPORT_HASH, bytes32(0), 1, 1, TOOL_VERSION, URI);
    }

    function test_RevertWhen_ChecksTotalIsZero() public {
        vm.expectRevert(
            abi.encodeWithSelector(IReportRegistry.InvalidChecks.selector, uint16(0), uint16(0))
        );
        registry.record(REPORT_HASH, SCENARIO_HASH, 0, 0, TOOL_VERSION, URI);
    }

    function test_RevertWhen_ChecksPassedExceedsChecksTotal() public {
        vm.expectRevert(
            abi.encodeWithSelector(IReportRegistry.InvalidChecks.selector, uint16(2), uint16(1))
        );
        registry.record(REPORT_HASH, SCENARIO_HASH, 2, 1, TOOL_VERSION, URI);
    }

    function test_RevertWhen_UriExceeds256Bytes() public {
        string memory longUri = _repeat("a", 257);
        vm.expectRevert(
            abi.encodeWithSelector(IReportRegistry.UriTooLong.selector, bytes(longUri).length)
        );
        registry.record(REPORT_HASH, SCENARIO_HASH, 1, 1, TOOL_VERSION, longUri);
    }

    function test_UriAtExactly256BytesIsAllowed() public {
        string memory uri = _repeat("a", 256);
        registry.record(REPORT_HASH, SCENARIO_HASH, 1, 1, TOOL_VERSION, uri);
        assertEq(bytes(registry.getRecord(REPORT_HASH).uri).length, 256);
    }

    function test_RevertWhen_ToolVersionExceeds32Bytes() public {
        string memory longVersion = _repeat("v", 33);
        vm.expectRevert(
            abi.encodeWithSelector(
                IReportRegistry.ToolVersionTooLong.selector, bytes(longVersion).length
            )
        );
        registry.record(REPORT_HASH, SCENARIO_HASH, 1, 1, longVersion, URI);
    }

    function test_ToolVersionAtExactly32BytesIsAllowed() public {
        string memory version = _repeat("v", 32);
        registry.record(REPORT_HASH, SCENARIO_HASH, 1, 1, version, URI);
        assertEq(bytes(registry.getRecord(REPORT_HASH).toolVersion).length, 32);
    }

    // --- fuzz ---

    function testFuzz_ValidInputsRecordAndReadBackIdentically(
        bytes32 reportHash,
        bytes32 scenarioHash,
        uint16 checksPassed,
        uint16 checksTotal,
        address submitter
    ) public {
        vm.assume(reportHash != bytes32(0));
        vm.assume(scenarioHash != bytes32(0));
        vm.assume(checksTotal > 0);
        vm.assume(checksPassed <= checksTotal);
        vm.assume(submitter != address(0));

        vm.prank(submitter);
        registry.record(reportHash, scenarioHash, checksPassed, checksTotal, TOOL_VERSION, URI);

        IReportRegistry.Record memory got = registry.getRecord(reportHash);
        assertEq(got.submitter, submitter);
        assertEq(got.scenarioHash, scenarioHash);
        assertEq(got.checksPassed, checksPassed);
        assertEq(got.checksTotal, checksTotal);
        assertTrue(registry.isRecorded(reportHash));
    }

    function testFuzz_RevertWhen_ChecksPassedExceedsChecksTotal(
        uint16 checksPassed,
        uint16 checksTotal
    ) public {
        vm.assume(checksPassed > checksTotal);
        vm.expectRevert(
            abi.encodeWithSelector(
                IReportRegistry.InvalidChecks.selector, checksPassed, checksTotal
            )
        );
        registry.record(REPORT_HASH, SCENARIO_HASH, checksPassed, checksTotal, TOOL_VERSION, URI);
    }

    // --- helpers ---

    function _repeat(bytes1 char, uint256 length) internal pure returns (string memory) {
        bytes memory result = new bytes(length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = char;
        }
        return string(result);
    }
}
