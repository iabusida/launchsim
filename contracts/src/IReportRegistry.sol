// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.28;

/// @notice A write-once registry of crash-test report hashes (docs/12, ADR 0007).
/// Recording proves a report is unchanged since it was published and who
/// published it -- nothing about whether the simulation was honest or the
/// token is safe (see docs/12's wording rules for the share page).
interface IReportRegistry {
    /// @notice One recorded report.
    struct Record {
        address submitter;
        uint64 recordedAt;
        bytes32 scenarioHash;
        uint16 checksPassed;
        uint16 checksTotal;
        string toolVersion;
        string uri;
    }

    event ReportRecorded(
        bytes32 indexed reportHash,
        address indexed submitter,
        bytes32 indexed scenarioHash,
        uint16 checksPassed,
        uint16 checksTotal,
        string toolVersion,
        string uri
    );

    /// @notice `record` was called again for a `reportHash` that already has a record.
    error AlreadyRecorded(bytes32 reportHash);

    /// @notice `reportHash` or `scenarioHash` was the zero hash.
    error ZeroHash();

    /// @notice `checksTotal` was zero, or `checksPassed` exceeded `checksTotal`.
    error InvalidChecks(uint16 checksPassed, uint16 checksTotal);

    /// @notice `uri` exceeded 256 bytes.
    error UriTooLong(uint256 length);

    /// @notice `toolVersion` exceeded 32 bytes.
    error ToolVersionTooLong(uint256 length);

    /// @notice Records a report. Reverts if `reportHash` already has a record.
    /// @param reportHash sha256 of the canonical `RunResult` JSON.
    /// @param scenarioHash sha256 of the canonical `ScenarioConfig` JSON.
    function record(
        bytes32 reportHash,
        bytes32 scenarioHash,
        uint16 checksPassed,
        uint16 checksTotal,
        string calldata toolVersion,
        string calldata uri
    ) external;

    /// @notice Returns `reportHash`'s record, or the zero-value `Record` if none exists.
    function getRecord(bytes32 reportHash) external view returns (Record memory);

    /// @notice Whether `reportHash` has a record.
    function isRecorded(bytes32 reportHash) external view returns (bool);
}
