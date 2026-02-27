// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/IdeaRegistry.sol";

contract IdeaRegistryTest is Test {
    IdeaRegistry public registry;
    address public owner  = address(this);
    address public alice  = address(0xA11CE);
    address public engine = address(0xE09);

    bytes32 constant TITLE_HASH = keccak256("Build the next great startup");

    function setUp() public {
        registry = new IdeaRegistry();
        registry.setVotingEngine(engine);
    }

    // ─── registerIdea ─────────────────────────────────────────────────────────

    function test_registerIdea_incrementsCount() public {
        assertEq(registry.ideaCount(), 0);
        vm.prank(alice);
        registry.registerIdea(TITLE_HASH);
        assertEq(registry.ideaCount(), 1);
    }

    function test_registerIdea_storesCorrectFields() public {
        vm.prank(alice);
        uint256 id = registry.registerIdea(TITLE_HASH);

        IdeaRegistry.Idea memory idea = registry.getIdea(id);
        assertEq(idea.id,         id);
        assertEq(idea.titleHash,  TITLE_HASH);
        assertEq(idea.founder,    alice);
        assertEq(idea.publishedAt, uint64(block.timestamp));
        assertEq(idea.closesAt,   uint64(block.timestamp) + registry.VOTING_WINDOW());
        assertEq(uint8(idea.status), uint8(IdeaRegistry.IdeaStatus.Active));
        assertEq(idea.yesWeight,  0);
        assertEq(idea.noWeight,   0);
    }

    function test_registerIdea_emitsEvent() public {
        uint64 expectedClose = uint64(block.timestamp) + registry.VOTING_WINDOW();
        vm.expectEmit(true, true, false, true);
        emit IdeaRegistry.IdeaRegistered(1, alice, TITLE_HASH, expectedClose);

        vm.prank(alice);
        registry.registerIdea(TITLE_HASH);
    }

    // ─── isVotingOpen ─────────────────────────────────────────────────────────

    function test_isVotingOpen_trueWhileActive() public {
        vm.prank(alice);
        uint256 id = registry.registerIdea(TITLE_HASH);
        assertTrue(registry.isVotingOpen(id));
    }

    function test_isVotingOpen_falseAfterWindow() public {
        vm.prank(alice);
        uint256 id = registry.registerIdea(TITLE_HASH);

        vm.warp(block.timestamp + registry.VOTING_WINDOW() + 1);
        assertFalse(registry.isVotingOpen(id));
    }

    function test_isVotingOpen_falseForNonexistentIdea() public {
        assertFalse(registry.isVotingOpen(99));
    }

    // ─── accumulateVote ───────────────────────────────────────────────────────

    function test_accumulateVote_updatesYesWeight() public {
        vm.prank(alice);
        uint256 id = registry.registerIdea(TITLE_HASH);

        vm.prank(engine);
        registry.accumulateVote(id, true, 3e18);

        assertEq(registry.getIdea(id).yesWeight, 3e18);
        assertEq(registry.getIdea(id).noWeight,  0);
    }

    function test_accumulateVote_updatesNoWeight() public {
        vm.prank(alice);
        uint256 id = registry.registerIdea(TITLE_HASH);

        vm.prank(engine);
        registry.accumulateVote(id, false, 2e18);

        assertEq(registry.getIdea(id).noWeight,  2e18);
        assertEq(registry.getIdea(id).yesWeight, 0);
    }

    function test_accumulateVote_revertsIfNotEngine() public {
        vm.prank(alice);
        uint256 id = registry.registerIdea(TITLE_HASH);

        vm.prank(alice);
        vm.expectRevert(IdeaRegistry.NotVotingEngine.selector);
        registry.accumulateVote(id, true, 1e18);
    }

    function test_accumulateVote_revertsAfterWindow() public {
        vm.prank(alice);
        uint256 id = registry.registerIdea(TITLE_HASH);

        vm.warp(block.timestamp + registry.VOTING_WINDOW() + 1);

        vm.prank(engine);
        vm.expectRevert(IdeaRegistry.VotingClosed.selector);
        registry.accumulateVote(id, true, 1e18);
    }

    function test_accumulateVote_revertsForNonexistentIdea() public {
        vm.prank(engine);
        vm.expectRevert(IdeaRegistry.IdeaDoesNotExist.selector);
        registry.accumulateVote(99, true, 1e18);
    }

    // ─── resolveIdea ──────────────────────────────────────────────────────────

    function test_resolveIdea_setsWon() public {
        vm.prank(alice);
        uint256 id = registry.registerIdea(TITLE_HASH);

        registry.resolveIdea(id, true, 85);

        IdeaRegistry.Idea memory idea = registry.getIdea(id);
        assertEq(uint8(idea.status), uint8(IdeaRegistry.IdeaStatus.Won));
        assertEq(idea.pmfScore, 85);
    }

    function test_resolveIdea_setsGraveyard() public {
        vm.prank(alice);
        uint256 id = registry.registerIdea(TITLE_HASH);

        registry.resolveIdea(id, false, 12);

        IdeaRegistry.Idea memory idea = registry.getIdea(id);
        assertEq(uint8(idea.status), uint8(IdeaRegistry.IdeaStatus.Graveyard));
        assertEq(idea.pmfScore, 12);
    }

    function test_resolveIdea_emitsEvent() public {
        vm.prank(alice);
        uint256 id = registry.registerIdea(TITLE_HASH);

        vm.expectEmit(true, false, false, true);
        emit IdeaRegistry.IdeaResolved(id, true, 90);
        registry.resolveIdea(id, true, 90);
    }

    function test_resolveIdea_revertsIfNotOwner() public {
        vm.prank(alice);
        uint256 id = registry.registerIdea(TITLE_HASH);

        vm.prank(alice);
        vm.expectRevert();
        registry.resolveIdea(id, true, 80);
    }

    function test_resolveIdea_revertsIfAlreadyResolved() public {
        vm.prank(alice);
        uint256 id = registry.registerIdea(TITLE_HASH);

        registry.resolveIdea(id, true, 80);

        vm.expectRevert(IdeaRegistry.IdeaNotActive.selector);
        registry.resolveIdea(id, false, 20);
    }

    // ─── setVotingEngine ──────────────────────────────────────────────────────

    function test_setVotingEngine_revertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        registry.setVotingEngine(alice);
    }
}
