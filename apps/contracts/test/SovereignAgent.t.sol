// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/SovereignAgent.sol";

contract SovereignAgentTest is Test {

    SovereignAgent public agent;

    address public owner     = address(this);
    address public operator  = address(0xBEEF);
    address public feeRecip  = address(0xFEED);
    address public alice     = address(0xA11CE);
    address public bob       = address(0xB0B);

    string  constant NAME    = "pitchdrop-sovereign-v1";
    string  constant VERSION = "1.0.0";

    bytes32 constant EIGEN_REF  = keccak256("eigenda-blob-1");
    bytes32 constant EIGEN_REF2 = keccak256("eigenda-blob-2");
    string  constant REASONING  = "Strong market fit, clear value proposition.";
    string  constant REASONING2 = "Updated reasoning after resolution.";

    function setUp() public {
        agent = new SovereignAgent(NAME, VERSION, operator, feeRecip);
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    function test_constructor_setsAgentName() public view {
        assertEq(agent.agentName(), NAME);
    }

    function test_constructor_setsAgentVersion() public view {
        assertEq(agent.agentVersion(), VERSION);
    }

    function test_constructor_setsOperator() public view {
        assertEq(agent.operator(), operator);
    }

    function test_constructor_setsFeeRecipient() public view {
        assertEq(agent.feeRecipient(), feeRecip);
    }

    function test_constructor_setsOwnerToDeployer() public view {
        assertEq(agent.owner(), owner);
    }

    function test_constructor_revertsZeroOperator() public {
        vm.expectRevert(SovereignAgent.ZeroAddress.selector);
        new SovereignAgent(NAME, VERSION, address(0), feeRecip);
    }

    function test_constructor_revertsZeroFeeRecipient() public {
        vm.expectRevert(SovereignAgent.ZeroAddress.selector);
        new SovereignAgent(NAME, VERSION, operator, address(0));
    }

    // ─── postAttestation ──────────────────────────────────────────────────────

    function test_postAttestation_storesData() public {
        vm.prank(operator);
        agent.postAttestation(1, 75, REASONING, EIGEN_REF);

        SovereignAgent.Attestation memory att = agent.getAttestation(1);
        assertEq(att.ideaId,       1);
        assertEq(att.qualityScore, 75);
        assertEq(att.reasoning,    REASONING);
        assertEq(att.eigenDaRef,   EIGEN_REF);
        assertEq(att.timestamp,    uint64(block.timestamp));
        assertTrue(att.exists);
    }

    function test_postAttestation_emitsEvent() public {
        uint64 expectedTs = uint64(block.timestamp);
        vm.expectEmit(true, false, false, true);
        emit SovereignAgent.AttestationPosted(1, 75, EIGEN_REF, expectedTs);

        vm.prank(operator);
        agent.postAttestation(1, 75, REASONING, EIGEN_REF);
    }

    function test_postAttestation_revertsAlreadyAttested() public {
        vm.prank(operator);
        agent.postAttestation(1, 75, REASONING, EIGEN_REF);

        vm.prank(operator);
        vm.expectRevert(SovereignAgent.AlreadyAttested.selector);
        agent.postAttestation(1, 80, REASONING, EIGEN_REF2);
    }

    function test_postAttestation_revertsNonOperator() public {
        vm.prank(alice);
        vm.expectRevert(SovereignAgent.NotOperator.selector);
        agent.postAttestation(1, 75, REASONING, EIGEN_REF);
    }

    function test_postAttestation_ownerBypasses() public {
        // owner is address(this) — no prank needed
        agent.postAttestation(1, 55, REASONING, EIGEN_REF);
        assertTrue(agent.hasAttestation(1));
    }

    function test_postAttestation_qualityScore_zero() public {
        vm.prank(operator);
        agent.postAttestation(42, 0, REASONING, EIGEN_REF);

        assertEq(agent.getAttestation(42).qualityScore, 0);
    }

    function test_postAttestation_qualityScore_100() public {
        vm.prank(operator);
        agent.postAttestation(42, 100, REASONING, EIGEN_REF);

        assertEq(agent.getAttestation(42).qualityScore, 100);
    }

    // ─── updateAttestation ────────────────────────────────────────────────────

    function test_updateAttestation_updatesFields() public {
        vm.prank(operator);
        agent.postAttestation(1, 50, REASONING, EIGEN_REF);

        vm.warp(block.timestamp + 100);

        vm.prank(operator);
        agent.updateAttestation(1, 90, REASONING2, EIGEN_REF2);

        SovereignAgent.Attestation memory att = agent.getAttestation(1);
        assertEq(att.qualityScore, 90);
        assertEq(att.reasoning,    REASONING2);
        assertEq(att.eigenDaRef,   EIGEN_REF2);
        assertEq(att.timestamp,    uint64(block.timestamp));
    }

    function test_updateAttestation_emitsEvent() public {
        vm.prank(operator);
        agent.postAttestation(1, 50, REASONING, EIGEN_REF);

        uint64 expectedTs = uint64(block.timestamp);
        vm.expectEmit(true, false, false, true);
        emit SovereignAgent.AttestationPosted(1, 90, EIGEN_REF2, expectedTs);

        vm.prank(operator);
        agent.updateAttestation(1, 90, REASONING2, EIGEN_REF2);
    }

    // ─── hasAttestation / getAttestation ──────────────────────────────────────

    function test_hasAttestation_falseBeforePosting() public view {
        assertFalse(agent.hasAttestation(99));
    }

    function test_hasAttestation_trueAfterPosting() public {
        vm.prank(operator);
        agent.postAttestation(7, 60, REASONING, EIGEN_REF);
        assertTrue(agent.hasAttestation(7));
    }

    function test_getAttestation_returnsCorrectData() public {
        vm.prank(operator);
        agent.postAttestation(3, 88, REASONING, EIGEN_REF);

        SovereignAgent.Attestation memory att = agent.getAttestation(3);
        assertEq(att.ideaId,       3);
        assertEq(att.qualityScore, 88);
        assertEq(att.reasoning,    REASONING);
        assertEq(att.eigenDaRef,   EIGEN_REF);
        assertTrue(att.exists);
    }

    // ─── routeFees ────────────────────────────────────────────────────────────

    function test_routeFees_transfersETH() public {
        vm.deal(address(agent), 1 ether);
        uint256 bobBefore = bob.balance;

        vm.prank(operator);
        agent.routeFees(bob, 0.5 ether);

        assertEq(bob.balance, bobBefore + 0.5 ether);
        assertEq(address(agent).balance, 0.5 ether);
    }

    function test_routeFees_updatesTotalFeesRouted() public {
        vm.deal(address(agent), 2 ether);

        vm.prank(operator);
        agent.routeFees(bob, 0.5 ether);

        vm.prank(operator);
        agent.routeFees(bob, 0.75 ether);

        assertEq(agent.totalFeesRouted(), 1.25 ether);
    }

    function test_routeFees_emitsFeeRouted() public {
        vm.deal(address(agent), 1 ether);

        vm.expectEmit(true, false, false, true);
        emit SovereignAgent.FeeRouted(bob, 0.3 ether);

        vm.prank(operator);
        agent.routeFees(bob, 0.3 ether);
    }

    function test_routeFees_revertsInsufficientBalance() public {
        vm.deal(address(agent), 0.1 ether);

        vm.prank(operator);
        vm.expectRevert(SovereignAgent.InsufficientBalance.selector);
        agent.routeFees(bob, 1 ether);
    }

    function test_routeFees_revertsNonOperator() public {
        vm.deal(address(agent), 1 ether);

        vm.prank(alice);
        vm.expectRevert(SovereignAgent.NotOperator.selector);
        agent.routeFees(bob, 0.1 ether);
    }

    // ─── setOperator ──────────────────────────────────────────────────────────

    function test_setOperator_changesOperator() public {
        agent.setOperator(alice);
        assertEq(agent.operator(), alice);
    }

    function test_setOperator_emitsOperatorUpdated() public {
        vm.expectEmit(true, true, false, false);
        emit SovereignAgent.OperatorUpdated(operator, alice);
        agent.setOperator(alice);
    }

    function test_setOperator_revertsZeroAddress() public {
        vm.expectRevert(SovereignAgent.ZeroAddress.selector);
        agent.setOperator(address(0));
    }

    function test_setOperator_revertsNonOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        agent.setOperator(alice);
    }

    // ─── setFeeRecipient ──────────────────────────────────────────────────────

    function test_setFeeRecipient_changesFeeRecipient() public {
        agent.setFeeRecipient(alice);
        assertEq(agent.feeRecipient(), alice);
    }

    function test_setFeeRecipient_emitsFeeRecipientUpdated() public {
        vm.expectEmit(true, false, false, false);
        emit SovereignAgent.FeeRecipientUpdated(alice);
        agent.setFeeRecipient(alice);
    }

    function test_setFeeRecipient_revertsZeroAddress() public {
        vm.expectRevert(SovereignAgent.ZeroAddress.selector);
        agent.setFeeRecipient(address(0));
    }

    function test_setFeeRecipient_revertsNonOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        agent.setFeeRecipient(alice);
    }

    // ─── receive ──────────────────────────────────────────────────────────────

    function test_receive_acceptsETH() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        (bool ok,) = address(agent).call{value: 0.5 ether}("");
        assertTrue(ok);
        assertEq(address(agent).balance, 0.5 ether);
    }

    function test_receive_emitsFeeReceived() public {
        vm.deal(alice, 1 ether);

        vm.expectEmit(true, false, false, true);
        emit SovereignAgent.FeeReceived(alice, 0.5 ether);

        vm.prank(alice);
        (bool ok,) = address(agent).call{value: 0.5 ether}("");
        assertTrue(ok);
    }
}
