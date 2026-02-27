// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/IdeaRegistry.sol";
import "../src/VotingEngine.sol";

contract VotingEngineTest is Test {
    IdeaRegistry public registry;
    VotingEngine public engine;

    address public owner = address(this);
    address public alice = address(0xA11CE);
    address public bob   = address(0xB0B);
    address public carol = address(0xCA901);

    bytes32 constant TITLE_HASH = keccak256("Perception market for startup ideas");

    uint256 public ideaId;

    function setUp() public {
        registry = new IdeaRegistry();
        engine   = new VotingEngine(address(registry));
        registry.setVotingEngine(address(engine));

        // Alice registers an idea
        vm.prank(alice);
        ideaId = registry.registerIdea(TITLE_HASH);
    }

    // ─── castVote — basic ─────────────────────────────────────────────────────

    function test_castVote_yesVoteRecorded() public {
        vm.prank(bob);
        engine.castVote(ideaId, true);

        VotingEngine.VoteRecord memory rec = engine.getVoteRecord(ideaId, bob);
        assertTrue(rec.hasVoted);
        assertTrue(rec.direction);
    }

    function test_castVote_noVoteRecorded() public {
        vm.prank(bob);
        engine.castVote(ideaId, false);

        VotingEngine.VoteRecord memory rec = engine.getVoteRecord(ideaId, bob);
        assertTrue(rec.hasVoted);
        assertFalse(rec.direction);
    }

    function test_castVote_emitsEvent() public {
        // Early phase → 3e18 weight, tier 1
        vm.expectEmit(true, true, false, true);
        emit VotingEngine.VoteCast(ideaId, bob, true, 3e18, 1);

        vm.prank(bob);
        engine.castVote(ideaId, true);
    }

    function test_castVote_accumulatesInRegistry() public {
        vm.prank(bob);
        engine.castVote(ideaId, true);

        vm.prank(carol);
        engine.castVote(ideaId, false);

        IdeaRegistry.Idea memory idea = registry.getIdea(ideaId);
        assertEq(idea.yesWeight, 3e18); // both in early phase
        assertEq(idea.noWeight,  3e18);
    }

    // ─── castVote — duplicate rejection ───────────────────────────────────────

    function test_castVote_revertsOnDuplicate() public {
        vm.prank(bob);
        engine.castVote(ideaId, true);

        vm.prank(bob);
        vm.expectRevert(VotingEngine.AlreadyVoted.selector);
        engine.castVote(ideaId, false);
    }

    // ─── castVote — window enforcement ────────────────────────────────────────

    function test_castVote_revertsAfterWindow() public {
        vm.warp(block.timestamp + registry.VOTING_WINDOW() + 1);

        vm.prank(bob);
        vm.expectRevert(VotingEngine.VotingClosed.selector);
        engine.castVote(ideaId, true);
    }

    function test_castVote_revertsOnResolvedIdea() public {
        registry.resolveIdea(ideaId, true, 80);

        vm.prank(bob);
        vm.expectRevert(VotingEngine.IdeaNotActive.selector);
        engine.castVote(ideaId, true);
    }

    // ─── Time-decay multipliers & airdrop tiers ───────────────────────────────

    function test_earlyPhase_tier1_3xWeight() public {
        // t = 0 → early phase, tier 1, 3× weight
        vm.prank(bob);
        engine.castVote(ideaId, true);

        VotingEngine.VoteRecord memory rec = engine.getVoteRecord(ideaId, bob);
        assertEq(rec.weight, 3e18);
        assertEq(rec.tier,   1);
    }

    function test_midPhase_tier2_2xWeight() public {
        // t = 13 h → mid phase, tier 2 (≤36h), 2× weight
        vm.warp(block.timestamp + 13 hours);

        vm.prank(bob);
        engine.castVote(ideaId, true);

        VotingEngine.VoteRecord memory rec = engine.getVoteRecord(ideaId, bob);
        assertEq(rec.weight, 2e18);
        assertEq(rec.tier,   2);
    }

    function test_midPhase_tier3_2xWeight() public {
        // t = 40 h → mid phase (≤55h), tier 3 (>36h), 2× weight
        vm.warp(block.timestamp + 40 hours);

        vm.prank(bob);
        engine.castVote(ideaId, true);

        VotingEngine.VoteRecord memory rec = engine.getVoteRecord(ideaId, bob);
        assertEq(rec.weight, 2e18);
        assertEq(rec.tier,   3);
    }

    function test_latePhase_tier3_1xWeight() public {
        // t = 60 h → late phase (>55h, ≤69h), tier 3, 1× weight
        vm.warp(block.timestamp + 60 hours);

        vm.prank(bob);
        engine.castVote(ideaId, true);

        VotingEngine.VoteRecord memory rec = engine.getVoteRecord(ideaId, bob);
        assertEq(rec.weight, 1e18);
        assertEq(rec.tier,   3);
    }

    function test_atExactWindowClose_allowed() public {
        // t = exactly 69 h — should still be allowed (≤ closesAt)
        vm.warp(block.timestamp + 69 hours);

        vm.prank(bob);
        engine.castVote(ideaId, true);

        assertTrue(engine.getVoteRecord(ideaId, bob).hasVoted);
    }

    // ─── computeWeightAndTier (public view) ───────────────────────────────────

    function test_computeWeightAndTier_boundaries() public view {
        (uint256 w, uint8 t) = engine.computeWeightAndTier(0);
        assertEq(w, 3e18); assertEq(t, 1);

        (w, t) = engine.computeWeightAndTier(12 hours);
        assertEq(w, 3e18); assertEq(t, 1);

        (w, t) = engine.computeWeightAndTier(12 hours + 1);
        assertEq(w, 2e18); assertEq(t, 2);

        (w, t) = engine.computeWeightAndTier(36 hours);
        assertEq(w, 2e18); assertEq(t, 2);

        (w, t) = engine.computeWeightAndTier(36 hours + 1);
        assertEq(w, 2e18); assertEq(t, 3);

        (w, t) = engine.computeWeightAndTier(55 hours);
        assertEq(w, 2e18); assertEq(t, 3);

        (w, t) = engine.computeWeightAndTier(55 hours + 1);
        assertEq(w, 1e18); assertEq(t, 3);

        (w, t) = engine.computeWeightAndTier(69 hours);
        assertEq(w, 1e18); assertEq(t, 3);
    }
}
