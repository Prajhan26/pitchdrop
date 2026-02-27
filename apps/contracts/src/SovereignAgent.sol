// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title SovereignAgent
/// @notice ERC-8004 inspired on-chain identity for the pitchdrop Sovereign Agent.
///         Runs inside an EigenCloud TEE; handles idea attestations, vote-weight
///         attestations, and fee routing.
contract SovereignAgent is Ownable {

    // ─── Agent Identity ───────────────────────────────────────────────────────

    string  public agentName;
    string  public agentVersion;

    /// @notice The TEE operator address — can post attestations and route fees.
    address public operator;

    // ─── Fee Routing ──────────────────────────────────────────────────────────

    address public feeRecipient;
    uint256 public totalFeesRouted;
    uint256 public constant FEE_BPS = 100; // 1% of each deposit routed to agent

    // ─── Attestations ─────────────────────────────────────────────────────────

    struct Attestation {
        uint256 ideaId;
        uint8   qualityScore;   // 0–100 AI-generated PMF quality score
        string  reasoning;      // human-readable AI reasoning (stored as string, pinned to EigenDA off-chain)
        bytes32 eigenDaRef;     // EigenDA blob reference (keccak256 of content)
        uint64  timestamp;
        bool    exists;
    }

    mapping(uint256 => Attestation) public attestations; // ideaId => Attestation

    // ─── Events ───────────────────────────────────────────────────────────────

    event AttestationPosted(
        uint256 indexed ideaId,
        uint8   qualityScore,
        bytes32 eigenDaRef,
        uint64  timestamp
    );
    event FeeRouted(address indexed to, uint256 amount);
    event FeeReceived(address indexed from, uint256 amount);
    event OperatorUpdated(address indexed oldOperator, address indexed newOperator);
    event FeeRecipientUpdated(address indexed newFeeRecipient);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotOperator();
    error AlreadyAttested();
    error InsufficientBalance();
    error TransferFailed();
    error ZeroAddress();

    // ─── Modifier ─────────────────────────────────────────────────────────────

    modifier onlyOperator() {
        if (msg.sender != operator && msg.sender != owner()) revert NotOperator();
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(
        string  memory name_,
        string  memory version_,
        address operator_,
        address feeRecipient_
    ) Ownable(msg.sender) {
        if (operator_     == address(0)) revert ZeroAddress();
        if (feeRecipient_ == address(0)) revert ZeroAddress();
        agentName     = name_;
        agentVersion  = version_;
        operator      = operator_;
        feeRecipient  = feeRecipient_;
    }

    // ─── Attestations ─────────────────────────────────────────────────────────

    /// @notice Post an AI-generated quality attestation for an idea.
    /// @param ideaId       The on-chain idea ID.
    /// @param qualityScore 0–100 AI-computed PMF quality score.
    /// @param reasoning    Human-readable reasoning string.
    /// @param eigenDaRef   keccak256 reference to the EigenDA blob with full attestation data.
    function postAttestation(
        uint256 ideaId,
        uint8   qualityScore,
        string  calldata reasoning,
        bytes32 eigenDaRef
    ) external onlyOperator {
        if (attestations[ideaId].exists) revert AlreadyAttested();
        attestations[ideaId] = Attestation({
            ideaId:       ideaId,
            qualityScore: qualityScore,
            reasoning:    reasoning,
            eigenDaRef:   eigenDaRef,
            timestamp:    uint64(block.timestamp),
            exists:       true
        });
        emit AttestationPosted(ideaId, qualityScore, eigenDaRef, uint64(block.timestamp));
    }

    /// @notice Update an existing attestation (e.g. after final resolution).
    function updateAttestation(
        uint256 ideaId,
        uint8   qualityScore,
        string  calldata reasoning,
        bytes32 eigenDaRef
    ) external onlyOperator {
        Attestation storage att = attestations[ideaId];
        att.qualityScore = qualityScore;
        att.reasoning    = reasoning;
        att.eigenDaRef   = eigenDaRef;
        att.timestamp    = uint64(block.timestamp);
        emit AttestationPosted(ideaId, qualityScore, eigenDaRef, uint64(block.timestamp));
    }

    // ─── Fee Routing ──────────────────────────────────────────────────────────

    /// @notice Route ETH to an arbitrary recipient (TEE operator calls this).
    function routeFees(address recipient, uint256 amount) external onlyOperator {
        if (address(this).balance < amount) revert InsufficientBalance();
        totalFeesRouted += amount;
        (bool ok,) = recipient.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit FeeRouted(recipient, amount);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setOperator(address newOperator) external onlyOwner {
        if (newOperator == address(0)) revert ZeroAddress();
        emit OperatorUpdated(operator, newOperator);
        operator = newOperator;
    }

    function setFeeRecipient(address newFeeRecipient) external onlyOwner {
        if (newFeeRecipient == address(0)) revert ZeroAddress();
        feeRecipient = newFeeRecipient;
        emit FeeRecipientUpdated(newFeeRecipient);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getAttestation(uint256 ideaId) external view returns (Attestation memory) {
        return attestations[ideaId];
    }

    function hasAttestation(uint256 ideaId) external view returns (bool) {
        return attestations[ideaId].exists;
    }

    // ─── Receive ──────────────────────────────────────────────────────────────

    receive() external payable {
        emit FeeReceived(msg.sender, msg.value);
    }
}
