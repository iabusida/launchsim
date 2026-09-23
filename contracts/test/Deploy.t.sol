// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {DeployScript} from "../script/Deploy.s.sol";
import {ReportRegistry} from "../src/ReportRegistry.sol";

/// @notice docs/12: "Deploy script tested against a local Anvil instance."
/// forge test runs on the same local EVM anvil does; the deploy script
/// itself does not care which one is behind vm.startBroadcast.
contract DeployScriptTest is Test {
    function test_RunDeploysAWorkingReportRegistry() public {
        DeployScript deployer = new DeployScript();
        ReportRegistry registry = deployer.run();

        assertTrue(address(registry).code.length > 0);
        assertFalse(registry.isRecorded(keccak256("anything")));

        registry.record(
            keccak256("report"), keccak256("scenario"), 1, 1, "0.1.0", "https://example.com"
        );
        assertTrue(registry.isRecorded(keccak256("report")));
    }
}
