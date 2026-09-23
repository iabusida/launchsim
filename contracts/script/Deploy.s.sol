// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.28;

import {Script} from "forge-std/Script.sol";
import {ReportRegistry} from "../src/ReportRegistry.sol";

/// @notice Deploys {ReportRegistry} (docs/12). No constructor args: the
/// contract has no owner, no config, nothing to initialize.
///
/// Usage (never with a mainnet key committed anywhere -- docs/08 golden
/// rule 7, docs/10): the human runs this with their own wallet or a
/// Foundry keystore, e.g.
///   forge script script/Deploy.s.sol:DeployScript --rpc-url <RPC> --account <keystore> --broadcast
contract DeployScript is Script {
    function run() external returns (ReportRegistry registry) {
        vm.startBroadcast();
        registry = new ReportRegistry();
        vm.stopBroadcast();
    }
}
