// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/IdeaRegistry.sol";
import "../src/VotingEngine.sol";

/// @notice Deploy IdeaRegistry + VotingEngine to Base Sepolia or Base mainnet.
///
/// Usage:
///   # Base Sepolia (testnet)
///   forge script script/Deploy.s.sol --rpc-url base_sepolia \
///     --private-key $PRIVATE_KEY --broadcast --verify
///
///   # Base mainnet
///   forge script script/Deploy.s.sol --rpc-url base \
///     --private-key $PRIVATE_KEY --broadcast --verify
///
/// After deployment, update NEXT_PUBLIC_IDEA_REGISTRY_ADDRESS and
/// NEXT_PUBLIC_VOTING_ENGINE_ADDRESS in apps/web/.env.local
contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        // 1. Deploy IdeaRegistry (Ownable — deployer becomes owner)
        IdeaRegistry registry = new IdeaRegistry();
        console.log("IdeaRegistry:  ", address(registry));

        // 2. Deploy VotingEngine, passing registry address
        VotingEngine engine = new VotingEngine(address(registry));
        console.log("VotingEngine:  ", address(engine));

        // 3. Authorize VotingEngine to call accumulateVote on IdeaRegistry
        registry.setVotingEngine(address(engine));
        console.log("setVotingEngine: done");

        vm.stopBroadcast();
    }
}
