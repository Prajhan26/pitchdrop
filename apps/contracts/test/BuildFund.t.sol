// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/BuildFund.sol";

contract BuildFundTest is Test {
    BuildFund public fund;
    address   public owner;
    address   public beneficiary;
    address   public stranger;

    function setUp() public {
        owner       = address(this);
        beneficiary = makeAddr("beneficiary");
        stranger    = makeAddr("stranger");
        fund        = new BuildFund(beneficiary);
        // Fund the test contract so it can send ETH
        vm.deal(address(this), 100 ether);
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    function _sendEth(uint256 amount) internal {
        (bool ok,) = address(fund).call{value: amount}("");
        require(ok, "ETH send failed");
    }

    // ── 1. Receives ETH and tracks totalReceived ──────────────────────────────

    function test_receivesEthAndTracksTotal() public {
        _sendEth(1 ether);
        assertEq(fund.totalReceived(), 1 ether);
        assertEq(address(fund).balance, 1 ether);
    }

    function test_accumulatesMultipleReceives() public {
        _sendEth(1 ether);
        _sendEth(2 ether);
        assertEq(fund.totalReceived(), 3 ether);
    }

    function test_emitsFundsReceivedEvent() public {
        vm.expectEmit(true, true, true, true, address(fund));
        emit BuildFund.FundsReceived(1 ether, 1 ether);
        _sendEth(1 ether);
    }

    // ── 2. burnDeadline set on first receive ──────────────────────────────────

    function test_burnDeadlineSetOnFirstReceive() public {
        assertFalse(fund.deadlineSet());
        uint256 ts = block.timestamp;
        _sendEth(1 ether);
        assertTrue(fund.deadlineSet());
        assertEq(fund.burnDeadline(), ts + 365 days);
    }

    function test_burnDeadlineNotChangedOnSubsequentReceive() public {
        uint256 ts = block.timestamp;
        _sendEth(1 ether);
        uint256 deadline = fund.burnDeadline();

        vm.warp(ts + 30 days);
        _sendEth(1 ether);

        // Deadline must still be the original one
        assertEq(fund.burnDeadline(), deadline);
    }

    // ── 3. addMilestone stores milestone ─────────────────────────────────────

    function test_addMilestoneStoresData() public {
        uint256 id = fund.addMilestone("Build MVP", 0.5 ether);
        assertEq(id, 0);
        assertEq(fund.milestoneCount(), 1);

        (string memory desc, uint256 amount, bool released) = fund.milestones(0);
        assertEq(desc,    "Build MVP");
        assertEq(amount,  0.5 ether);
        assertFalse(released);
    }

    function test_addMilestoneEmitsEvent() public {
        vm.expectEmit(true, false, false, true, address(fund));
        emit BuildFund.MilestoneAdded(0, "Phase 1", 1 ether);
        fund.addMilestone("Phase 1", 1 ether);
    }

    function test_milestoneCountIncrementsCorrectly() public {
        assertEq(fund.milestoneCount(), 0);
        fund.addMilestone("M1", 0.1 ether);
        fund.addMilestone("M2", 0.2 ether);
        fund.addMilestone("M3", 0.3 ether);
        assertEq(fund.milestoneCount(), 3);
    }

    // ── 4. releaseMilestone sends ETH to beneficiary, marks released ──────────

    function test_releaseMilestoneSendsEthAndMarksReleased() public {
        _sendEth(5 ether);
        fund.addMilestone("Ship it", 2 ether);

        uint256 balBefore = beneficiary.balance;
        fund.releaseMilestone(0);
        uint256 balAfter = beneficiary.balance;

        assertEq(balAfter - balBefore, 2 ether);
        assertEq(fund.totalReleased(), 2 ether);

        (,, bool released) = fund.milestones(0);
        assertTrue(released);
    }

    function test_releaseMilestoneEmitsEvent() public {
        _sendEth(5 ether);
        fund.addMilestone("Ship it", 2 ether);

        vm.expectEmit(true, false, false, true, address(fund));
        emit BuildFund.MilestoneReleased(0, 2 ether, beneficiary);
        fund.releaseMilestone(0);
    }

    // ── 5. Cannot release same milestone twice (MilestoneAlreadyReleased) ─────

    function test_cannotReleaseSameMilestoneTwice() public {
        _sendEth(5 ether);
        fund.addMilestone("Once", 1 ether);
        fund.releaseMilestone(0);

        vm.expectRevert(BuildFund.MilestoneAlreadyReleased.selector);
        fund.releaseMilestone(0);
    }

    // ── 6. InsufficientBalance when balance too low ───────────────────────────

    function test_revertInsufficientBalance() public {
        _sendEth(0.5 ether);
        fund.addMilestone("Too big", 1 ether);

        vm.expectRevert(BuildFund.InsufficientBalance.selector);
        fund.releaseMilestone(0);
    }

    // ── 7. MilestoneDoesNotExist ──────────────────────────────────────────────

    function test_revertMilestoneDoesNotExist() public {
        vm.expectRevert(BuildFund.MilestoneDoesNotExist.selector);
        fund.releaseMilestone(999);
    }

    // ── 8. burnUnclaimed fails before deadline (BurnDeadlineNotReached) ───────

    function test_burnUnclaimedFailsBeforeDeadline() public {
        _sendEth(1 ether);

        vm.expectRevert(BuildFund.BurnDeadlineNotReached.selector);
        fund.burnUnclaimed();
    }

    // ── 9. burnUnclaimed succeeds after deadline (vm.warp) ────────────────────

    function test_burnUnclaimedSucceedsAfterDeadline() public {
        _sendEth(3 ether);
        uint256 deadline = fund.burnDeadline();

        vm.warp(deadline + 1);

        uint256 deadBalance = address(0xdead).balance;
        fund.burnUnclaimed();

        assertEq(address(fund).balance, 0);
        assertEq(address(0xdead).balance, deadBalance + 3 ether);
    }

    function test_burnUnclaimedEmitsEvent() public {
        _sendEth(2 ether);
        vm.warp(fund.burnDeadline() + 1);

        vm.expectEmit(true, true, true, true, address(fund));
        emit BuildFund.UnclaimedBurned(2 ether);
        fund.burnUnclaimed();
    }

    // ── 10. onlyOwner guards ──────────────────────────────────────────────────

    function test_strangerCannotAddMilestone() public {
        vm.prank(stranger);
        vm.expectRevert();
        fund.addMilestone("Hack", 1 ether);
    }

    function test_strangerCannotReleaseMilestone() public {
        _sendEth(1 ether);
        fund.addMilestone("M", 0.5 ether);

        vm.prank(stranger);
        vm.expectRevert();
        fund.releaseMilestone(0);
    }
}
