// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/IdeaRegistry.sol";
import "../src/VotingEngine.sol";
import "../src/ConvictionToken.sol";
import "../src/BondingCurve.sol";
import "../src/BuildFund.sol";
import "../src/AirdropDistributor.sol";
import "../src/ReputationRegistry.sol";
import "../src/SovereignAgent.sol";

/// @notice Deploy all pitchdrop contracts to Base Sepolia or Base mainnet.
/// Usage:
///   forge script script/Deploy.s.sol --rpc-url base_sepolia \
///     --private-key $PRIVATE_KEY --broadcast --verify
///
/// After deployment copy the logged addresses into your .env files.
contract Deploy is Script {
    function run() external {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        vm.startBroadcast();

        // 1. Core voting contracts
        IdeaRegistry registry = new IdeaRegistry();
        console.log("IdeaRegistry:            ", address(registry));

        VotingEngine engine = new VotingEngine(address(registry));
        console.log("VotingEngine:            ", address(engine));

        registry.setVotingEngine(address(engine));
        console.log("setVotingEngine:          done");

        // 2. Token market contracts
        ConvictionTokenFactory tokenFactory = new ConvictionTokenFactory();
        console.log("ConvictionTokenFactory:  ", address(tokenFactory));

        BondingCurveFactory curveFactory = new BondingCurveFactory();
        console.log("BondingCurveFactory:     ", address(curveFactory));

        // Transfer tokenFactory ownership to curveFactory so launch() can registerCurve
        tokenFactory.transferOwnership(address(curveFactory));
        console.log("tokenFactory -> curveFactory ownership: done");

        // 3. Downstream contracts
        AirdropDistributor airdrop = new AirdropDistributor();
        console.log("AirdropDistributor:      ", address(airdrop));

        ReputationRegistry repRegistry = new ReputationRegistry();
        console.log("ReputationRegistry:      ", address(repRegistry));

        // BuildFund beneficiary = deployer for now; update after team multisig is set up
        BuildFund buildFund = new BuildFund(deployer);
        console.log("BuildFund:               ", address(buildFund));

        // 4. Sovereign Agent — deployer acts as TEE operator until EigenCloud is wired
        SovereignAgent agent = new SovereignAgent(
            "pitchdrop-sovereign-agent",
            "1.0.0",
            deployer,   // operator
            deployer    // feeRecipient
        );
        console.log("SovereignAgent:          ", address(agent));

        vm.stopBroadcast();

        console.log("\n=== Copy these into your .env files ===");
        console.log("IDEA_REGISTRY_ADDRESS=", address(registry));
        console.log("VOTING_ENGINE_ADDRESS=", address(engine));
        console.log("CONVICTION_TOKEN_FACTORY_ADDRESS=", address(tokenFactory));
        console.log("BONDING_CURVE_FACTORY_ADDRESS=", address(curveFactory));
        console.log("AIRDROP_DISTRIBUTOR_ADDRESS=", address(airdrop));
        console.log("REPUTATION_REGISTRY_ADDRESS=", address(repRegistry));
        console.log("BUILD_FUND_ADDRESS=", address(buildFund));
        console.log("SOVEREIGN_AGENT_ADDRESS=", address(agent));
    }
}
