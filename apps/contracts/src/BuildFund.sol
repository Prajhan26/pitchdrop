// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title BuildFund
/// @notice Holds 15% of bonding curve proceeds and releases funds on milestone approval.
///         Unclaimed funds are burned to 0xdead after a 1-year deadline.
contract BuildFund is Ownable {
    struct Milestone {
        string  description;
        uint256 releaseAmount; // ETH in wei
        bool    released;
    }

    uint256 public constant BURN_DEADLINE_OFFSET = 365 days; // 1 year after fund receipt

    uint256 public burnDeadline;     // immutable once set, set on first receive
    bool    public deadlineSet;
    uint256 public totalReceived;
    uint256 public totalReleased;
    address public beneficiary;       // founder / project address

    Milestone[] public milestones;

    event FundsReceived(uint256 amount, uint256 newTotal);
    event MilestoneAdded(uint256 indexed milestoneId, string description, uint256 releaseAmount);
    event MilestoneReleased(uint256 indexed milestoneId, uint256 amount, address beneficiary);
    event UnclaimedBurned(uint256 amount);

    error MilestoneAlreadyReleased();
    error MilestoneDoesNotExist();
    error InsufficientBalance();
    error BurnDeadlineNotReached();
    error BurnDeadlineAlreadySet();
    error TransferFailed();

    constructor(address beneficiary_) Ownable(msg.sender) {
        beneficiary = beneficiary_;
    }

    receive() external payable {
        totalReceived += msg.value;
        if (!deadlineSet) {
            burnDeadline = block.timestamp + BURN_DEADLINE_OFFSET;
            deadlineSet  = true;
        }
        emit FundsReceived(msg.value, totalReceived);
    }

    function addMilestone(string calldata description, uint256 releaseAmount) external onlyOwner returns (uint256 milestoneId) {
        milestones.push(Milestone({ description: description, releaseAmount: releaseAmount, released: false }));
        milestoneId = milestones.length - 1;
        emit MilestoneAdded(milestoneId, description, releaseAmount);
    }

    function releaseMilestone(uint256 milestoneId) external onlyOwner {
        if (milestoneId >= milestones.length)        revert MilestoneDoesNotExist();
        Milestone storage m = milestones[milestoneId];
        if (m.released)                              revert MilestoneAlreadyReleased();
        if (address(this).balance < m.releaseAmount) revert InsufficientBalance();
        m.released     = true;
        totalReleased += m.releaseAmount;
        (bool ok,) = beneficiary.call{value: m.releaseAmount}("");
        if (!ok) revert TransferFailed();
        emit MilestoneReleased(milestoneId, m.releaseAmount, beneficiary);
    }

    function burnUnclaimed() external onlyOwner {
        if (block.timestamp < burnDeadline) revert BurnDeadlineNotReached();
        uint256 amount = address(this).balance;
        (bool ok,) = address(0xdead).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit UnclaimedBurned(amount);
    }

    function milestoneCount() external view returns (uint256) { return milestones.length; }
}
