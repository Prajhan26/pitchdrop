// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title IdeaRegistry
/// @notice Stores startup ideas, manages 69-hour voting windows, and tracks
///         accumulated YES/NO vote weight contributed by VotingEngine.
contract IdeaRegistry is Ownable {
    // ─── Constants ────────────────────────────────────────────────────────────

    /// @notice Voting window duration: 69 hours in seconds.
    uint64 public constant VOTING_WINDOW = 69 hours;

    // ─── Types ────────────────────────────────────────────────────────────────

    enum IdeaStatus {
        Active,     // 0 — voting open (default after registration)
        Won,        // 1 — resolved as market winner
        Graveyard   // 2 — resolved as market loser
    }

    struct Idea {
        uint256 id;
        bytes32 titleHash;   // keccak256 of title (privacy-preserving)
        address founder;
        uint64  publishedAt;
        uint64  closesAt;    // publishedAt + VOTING_WINDOW
        IdeaStatus status;
        uint256 yesWeight;   // accumulated YES weight (1e18 = 1.0 base vote)
        uint256 noWeight;    // accumulated NO  weight
        uint32  pmfScore;    // PMF score set at resolution (0–100)
    }

    // ─── State ────────────────────────────────────────────────────────────────

    uint256 public ideaCount;
    mapping(uint256 => Idea) public ideas;
    address public votingEngine;

    // ─── Events ───────────────────────────────────────────────────────────────

    event IdeaRegistered(
        uint256 indexed ideaId,
        address indexed founder,
        bytes32 titleHash,
        uint64  closesAt
    );
    event IdeaResolved(uint256 indexed ideaId, bool won, uint32 pmfScore);
    event VotingEngineSet(address indexed votingEngine);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotVotingEngine();
    error IdeaNotActive();
    error VotingClosed();
    error IdeaDoesNotExist();

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyVotingEngine() {
        if (msg.sender != votingEngine) revert NotVotingEngine();
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ─── Admin ────────────────────────────────────────────────────────────────

    /// @notice Point to the deployed VotingEngine so it can call accumulateVote.
    function setVotingEngine(address _votingEngine) external onlyOwner {
        votingEngine = _votingEngine;
        emit VotingEngineSet(_votingEngine);
    }

    // ─── Core ─────────────────────────────────────────────────────────────────

    /// @notice Register a new idea and open its 69-hour voting window.
    /// @param titleHash keccak256 of the idea title (store plaintext off-chain).
    /// @return ideaId The on-chain ID assigned to this idea.
    function registerIdea(bytes32 titleHash) external returns (uint256 ideaId) {
        ideaId = ++ideaCount;

        uint64 now_     = uint64(block.timestamp);
        uint64 closesAt = now_ + VOTING_WINDOW;

        ideas[ideaId] = Idea({
            id:          ideaId,
            titleHash:   titleHash,
            founder:     msg.sender,
            publishedAt: now_,
            closesAt:    closesAt,
            status:      IdeaStatus.Active,
            yesWeight:   0,
            noWeight:    0,
            pmfScore:    0
        });

        emit IdeaRegistered(ideaId, msg.sender, titleHash, closesAt);
    }

    /// @notice Called by VotingEngine to accumulate vote weight.
    /// @param ideaId  The idea being voted on.
    /// @param isYes   True for YES vote, false for NO vote.
    /// @param weight  Vote weight (scaled to 1e18).
    function accumulateVote(
        uint256 ideaId,
        bool    isYes,
        uint256 weight
    ) external onlyVotingEngine {
        Idea storage idea = ideas[ideaId];
        if (idea.founder == address(0)) revert IdeaDoesNotExist();
        if (idea.status != IdeaStatus.Active) revert IdeaNotActive();
        if (block.timestamp > idea.closesAt)  revert VotingClosed();

        if (isYes) {
            idea.yesWeight += weight;
        } else {
            idea.noWeight += weight;
        }
    }

    /// @notice Resolve an idea after its voting window closes (or early by owner).
    /// @param ideaId   The idea to resolve.
    /// @param won      True → Won, false → Graveyard.
    /// @param pmfScore PMF score 0–100 set by the Sovereign Agent.
    function resolveIdea(
        uint256 ideaId,
        bool    won,
        uint32  pmfScore
    ) external onlyOwner {
        Idea storage idea = ideas[ideaId];
        if (idea.founder == address(0)) revert IdeaDoesNotExist();
        if (idea.status != IdeaStatus.Active) revert IdeaNotActive();

        idea.status   = won ? IdeaStatus.Won : IdeaStatus.Graveyard;
        idea.pmfScore = pmfScore;

        emit IdeaResolved(ideaId, won, pmfScore);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /// @notice Return the full Idea struct for a given ID.
    function getIdea(uint256 ideaId) external view returns (Idea memory) {
        return ideas[ideaId];
    }

    /// @notice True if the idea exists, is Active, and the window is still open.
    function isVotingOpen(uint256 ideaId) external view returns (bool) {
        Idea storage idea = ideas[ideaId];
        return
            idea.founder != address(0) &&
            idea.status == IdeaStatus.Active &&
            block.timestamp <= idea.closesAt;
    }
}
