// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.28;

import {IReportRegistry} from "./IReportRegistry.sol";

/// @notice See {IReportRegistry}. No owner, no pause, no upgrade proxy, no
/// `payable`, no external calls -- the tiniest possible attack surface
/// (ADR 0007): the only state this contract can ever hold is records.
contract ReportRegistry is IReportRegistry {
    uint256 private constant MAX_URI_BYTES = 256;
    uint256 private constant MAX_TOOL_VERSION_BYTES = 32;

    mapping(bytes32 reportHash => Record) private _records;

    /// @inheritdoc IReportRegistry
    function record(
        bytes32 reportHash,
        bytes32 scenarioHash,
        uint16 checksPassed,
        uint16 checksTotal,
        string calldata toolVersion,
        string calldata uri
    ) external {
        if (reportHash == bytes32(0) || scenarioHash == bytes32(0)) {
            revert ZeroHash();
        }
        if (checksTotal == 0 || checksPassed > checksTotal) {
            revert InvalidChecks(checksPassed, checksTotal);
        }
        if (bytes(uri).length > MAX_URI_BYTES) {
            revert UriTooLong(bytes(uri).length);
        }
        if (bytes(toolVersion).length > MAX_TOOL_VERSION_BYTES) {
            revert ToolVersionTooLong(bytes(toolVersion).length);
        }
        if (_records[reportHash].submitter != address(0)) {
            revert AlreadyRecorded(reportHash);
        }

        _records[reportHash] = Record({
            submitter: msg.sender,
            recordedAt: uint64(block.timestamp),
            scenarioHash: scenarioHash,
            checksPassed: checksPassed,
            checksTotal: checksTotal,
            toolVersion: toolVersion,
            uri: uri
        });

        emit ReportRecorded(
            reportHash, msg.sender, scenarioHash, checksPassed, checksTotal, toolVersion, uri
        );
    }

    /// @inheritdoc IReportRegistry
    function getRecord(bytes32 reportHash) external view returns (Record memory) {
        return _records[reportHash];
    }

    /// @inheritdoc IReportRegistry
    function isRecorded(bytes32 reportHash) external view returns (bool) {
        return _records[reportHash].submitter != address(0);
    }
}
