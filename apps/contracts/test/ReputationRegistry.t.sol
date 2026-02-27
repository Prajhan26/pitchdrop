// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ReputationRegistry.sol";

contract ReputationRegistryTest is Test {
    ReputationRegistry public registry;

    address public owner;
    address public walletA;
    address public walletB;
    address public stranger;

    function setUp() public {
        owner    = address(this);
        walletA  = makeAddr("walletA");
        walletB  = makeAddr("walletB");
        stranger = makeAddr("stranger");

        registry = new ReputationRegistry();
    }

    // ── 1. mint creates token, stores data, emits event ───────────────────────

    function test_mintCreatesToken() public {
        uint256 tokenId = registry.mint(walletA, 50, 10, 7, 3);
        assertEq(tokenId, 1);
        assertEq(registry.ownerOf(1), walletA);
    }

    function test_mintStoresReputationData() public {
        uint256 ts = block.timestamp;
        uint256 tokenId = registry.mint(walletA, 75, 20, 15, 5);

        ReputationRegistry.ReputationData memory data = registry.getReputation(walletA);
        assertEq(data.score,        75);
        assertEq(data.totalVotes,   20);
        assertEq(data.correctCalls, 15);
        assertEq(data.streakDays,   5);
        assertEq(data.lastUpdated,  ts);
        assertEq(tokenId, 1);
    }

    function test_mintSetsTokenOfWallet() public {
        registry.mint(walletA, 50, 10, 7, 3);
        assertEq(registry.tokenOfWallet(walletA), 1);
    }

    function test_mintEmitsReputationMintedEvent() public {
        vm.expectEmit(true, false, false, true, address(registry));
        emit ReputationRegistry.ReputationMinted(walletA, 1);
        registry.mint(walletA, 50, 10, 7, 3);
    }

    function test_mintIncrementsTokenId() public {
        uint256 idA = registry.mint(walletA, 50, 10, 7, 3);
        uint256 idB = registry.mint(walletB, 80, 30, 25, 10);
        assertEq(idA, 1);
        assertEq(idB, 2);
    }

    // ── 2. AlreadyMinted on second mint for same wallet ───────────────────────

    function test_alreadyMintedReverts() public {
        registry.mint(walletA, 50, 10, 7, 3);

        vm.expectRevert(ReputationRegistry.AlreadyMinted.selector);
        registry.mint(walletA, 60, 11, 8, 4);
    }

    // ── 3. updateReputation updates data correctly ────────────────────────────

    function test_updateReputationChangesData() public {
        registry.mint(walletA, 50, 10, 7, 3);

        vm.warp(block.timestamp + 1 days);
        uint256 ts = block.timestamp;

        registry.updateReputation(walletA, 90, 30, 25, 12);

        ReputationRegistry.ReputationData memory data = registry.getReputation(walletA);
        assertEq(data.score,        90);
        assertEq(data.totalVotes,   30);
        assertEq(data.correctCalls, 25);
        assertEq(data.streakDays,   12);
        assertEq(data.lastUpdated,  ts);
    }

    function test_updateReputationEmitsEvent() public {
        registry.mint(walletA, 50, 10, 7, 3);

        vm.expectEmit(true, false, false, true, address(registry));
        emit ReputationRegistry.ReputationUpdated(walletA, 1, 90);
        registry.updateReputation(walletA, 90, 30, 25, 12);
    }

    // ── 4. NotYetMinted if wallet has no token ────────────────────────────────

    function test_updateReputationNotYetMintedReverts() public {
        vm.expectRevert(ReputationRegistry.NotYetMinted.selector);
        registry.updateReputation(walletA, 50, 10, 7, 3);
    }

    // ── 5. getReputation returns correct data ─────────────────────────────────

    function test_getReputationReturnsCorrectData() public {
        registry.mint(walletA, 42, 8, 6, 2);
        ReputationRegistry.ReputationData memory data = registry.getReputation(walletA);
        assertEq(data.score,        42);
        assertEq(data.totalVotes,   8);
        assertEq(data.correctCalls, 6);
        assertEq(data.streakDays,   2);
    }

    // ── 6. transferFrom reverts with Soulbound ────────────────────────────────

    function test_transferFromReverts() public {
        registry.mint(walletA, 50, 10, 7, 3);

        vm.prank(walletA);
        vm.expectRevert(ReputationRegistry.Soulbound.selector);
        registry.transferFrom(walletA, walletB, 1);
    }

    // ── 7. safeTransferFrom reverts with Soulbound ────────────────────────────

    function test_safeTransferFromReverts() public {
        registry.mint(walletA, 50, 10, 7, 3);

        vm.prank(walletA);
        vm.expectRevert(ReputationRegistry.Soulbound.selector);
        registry.safeTransferFrom(walletA, walletB, 1, "");
    }

    // ── 8. tokenOfWallet mapping correct after mint ───────────────────────────

    function test_tokenOfWalletMapping() public {
        assertEq(registry.tokenOfWallet(walletA), 0); // no token yet
        registry.mint(walletA, 50, 10, 7, 3);
        assertEq(registry.tokenOfWallet(walletA), 1);
        registry.mint(walletB, 80, 20, 15, 8);
        assertEq(registry.tokenOfWallet(walletB), 2);
    }

    // ── 9. Score 0 edge case ──────────────────────────────────────────────────

    function test_scoreZeroEdgeCase() public {
        registry.mint(walletA, 0, 0, 0, 0);
        ReputationRegistry.ReputationData memory data = registry.getReputation(walletA);
        assertEq(data.score, 0);
        assertEq(data.totalVotes, 0);
    }

    // ── 10. Score 100 edge case ───────────────────────────────────────────────

    function test_scoreHundredEdgeCase() public {
        registry.mint(walletA, 100, type(uint32).max, type(uint32).max, type(uint32).max);
        ReputationRegistry.ReputationData memory data = registry.getReputation(walletA);
        assertEq(data.score,        100);
        assertEq(data.totalVotes,   type(uint32).max);
        assertEq(data.correctCalls, type(uint32).max);
        assertEq(data.streakDays,   type(uint32).max);
    }

    // ── 11. onlyOwner guard on mint ───────────────────────────────────────────

    function test_strangerCannotMint() public {
        vm.prank(stranger);
        vm.expectRevert();
        registry.mint(walletA, 50, 10, 7, 3);
    }

    // ── 12. onlyOwner guard on updateReputation ───────────────────────────────

    function test_strangerCannotUpdateReputation() public {
        registry.mint(walletA, 50, 10, 7, 3);

        vm.prank(stranger);
        vm.expectRevert();
        registry.updateReputation(walletA, 90, 30, 25, 12);
    }
}
