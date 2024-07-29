// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {EthBettingDapp} from "../src/wager.sol";



contract DeployerScript is Script {
    function setUp() public {}

   function run() public returns (EthBettingDapp)  {
        vm.startBroadcast();
        EthBettingDapp app = new EthBettingDapp();

        vm.stopBroadcast();

         return app;

    }
}
