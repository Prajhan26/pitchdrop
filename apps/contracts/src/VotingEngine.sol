// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IdeaRegistry.sol";

/// @title VotingEngine
/// @notice Manages YES/NO votes with time-decay multipliers and airdrop-tier
///         assignment.  One vote per wallet per idea.
///
/// Time-decay multipliers (based on voting phase):
///   Early  (0 - 12 h)  -> 3x weight  -> Airdrop Tier 1
///   Mid   (12 - 55 h)  -> 2x weight  -> Airdrop Tier 2 (<=36h) / Tier 3 (>36h)
///   Late  (55 - 69 h)  -> 1x weight  -> Airdrop Tier 3
///
/// Airdrop tiers (mirrors getAirdropTier in packages/shared):
///   Tier 1  <= 12 h
///   Tier 2  12 h < t <= 36 h
///   Tier 3  > 36 h
contract VotingEngine {
    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 public constant SCALE            = 1e18;
    uint256 public constant MULTIPLIER_EARLY = 3 * 1e18; // 3× — early phase
    uint256 public constant MULTIPLIER_MID   = 2 * 1e18; // 2× — mid phase
    uint256 public constant MULTIPLIER_LATE  = 1 * 1e18; // 1× — late phase

    uint64 private constant _12H = 12 hours;
    uint64 private constant _36H = 36 hours;
    uint64 private constant _55H = 55 hours;

    // ─── Types ────────────────────────────────────────────────────────────────

    struct VoteRecord {
        bool    hasVoted;
        bool    direction; // true = YES, false = NO
        uint256 weight;    // scaled to 1e18
        uint8   tier;      // 1 | 2 | 3
        uint64  castedAt;
    }

    // ─── State ────────────────────────────────────────────────────────────────

    IdeaRegistry public immutable registry;

    /// @notice ideaId → voter → VoteRecord
    mapping(uint256 => mapping(address => VoteRecord)) public voteRecords;

    // ─── Events ───────────────────────────────────────────────────────────────

    event VoteCast(
        uint256 indexed ideaId,
        address indexed voter,
        bool    direction,
        uint256 weight,
        uint8   tier
    );

    // ─── Errors ───────────────────────────────────────────────────────────────

    error AlreadyVoted();
    error IdeaNotActive();
    error VotingClosed();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _registry) {
        registry = IdeaRegistry(_registry);
    }

    // ─── Core ─────────────────────────────────────────────────────────────────

    /// @notice Cast a YES or NO vote on an active idea.
    /// @param ideaId    The idea to vote on.
    /// @param direction True = YES, false = NO.
    function castVote(uint256 ideaId, bool direction) external {
        if (voteRecords[ideaId][msg.sender].hasVoted) revert AlreadyVoted();

        IdeaRegistry.Idea memory idea = registry.getIdea(ideaId);
        if (idea.status != IdeaRegistry.IdeaStatus.Active) revert IdeaNotActive();
        if (block.timestamp > idea.closesAt)              revert VotingClosed();

        uint64 elapsed = uint64(block.timestamp) - idea.publishedAt;
        (uint256 weight, uint8 tier) = _computeWeightAndTier(elapsed);

        voteRecords[ideaId][msg.sender] = VoteRecord({
            hasVoted:  true,
            direction: direction,
            weight:    weight,
            tier:      tier,
            castedAt:  uint64(block.timestamp)
        });

        // Accumulate in registry (registry validates window again as a guard).
        registry.accumulateVote(ideaId, direction, weight);

        emit VoteCast(ideaId, msg.sender, direction, weight, tier);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /// @notice Return the vote record for a specific voter on a specific idea.
    function getVoteRecord(
        uint256 ideaId,
        address voter
    ) external view returns (VoteRecord memory) {
        return voteRecords[ideaId][voter];
    }

    /// @notice Compute the time-decay multiplier and airdrop tier for an elapsed
    ///         duration.  Mirrors the logic in packages/shared.
    /// @param elapsedSeconds Seconds since the idea's publishedAt timestamp.
    /// @return weight Vote weight scaled to 1e18.
    /// @return tier   Airdrop tier (1, 2, or 3).
    function computeWeightAndTier(
        uint64 elapsedSeconds
    ) external pure returns (uint256 weight, uint8 tier) {
        return _computeWeightAndTier(elapsedSeconds);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _computeWeightAndTier(
        uint64 elapsedSeconds
    ) internal pure returns (uint256 weight, uint8 tier) {
        if (elapsedSeconds <= _12H) {
            // Early phase — Tier 1
            return (MULTIPLIER_EARLY, 1);
        } else if (elapsedSeconds <= _36H) {
            // Mid phase — Tier 2
            return (MULTIPLIER_MID, 2);
        } else if (elapsedSeconds <= _55H) {
            // Mid phase (continued) — Tier 3 (past 36h boundary)
            return (MULTIPLIER_MID, 3);
        } else {
            // Late phase — Tier 3
            return (MULTIPLIER_LATE, 3);
        }
    }
}
