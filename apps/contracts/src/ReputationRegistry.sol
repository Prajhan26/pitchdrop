// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ReputationRegistry
/// @notice Soulbound ERC-721 (non-transferable) — one token per wallet.
///         Stores on-chain reputation scores for pitchdrop participants.
contract ReputationRegistry is ERC721, Ownable {
    struct ReputationData {
        uint8   score;        // 0–100
        uint32  totalVotes;
        uint32  correctCalls;
        uint32  streakDays;
        uint64  lastUpdated;
    }

    uint256 private _nextTokenId;
    mapping(address => uint256) public tokenOfWallet;     // wallet => tokenId (0 = no token)
    mapping(uint256 => ReputationData) public reputation; // tokenId => data

    event ReputationMinted(address indexed wallet, uint256 tokenId);
    event ReputationUpdated(address indexed wallet, uint256 tokenId, uint8 score);

    error AlreadyMinted();
    error NotYetMinted();
    error Soulbound();

    constructor() ERC721("Pitchdrop Reputation", "PDROP-REP") Ownable(msg.sender) {}

    function mint(
        address wallet,
        uint8   score,
        uint32  totalVotes,
        uint32  correctCalls,
        uint32  streakDays
    ) external onlyOwner returns (uint256 tokenId) {
        if (tokenOfWallet[wallet] != 0) revert AlreadyMinted();
        tokenId = ++_nextTokenId;
        _safeMint(wallet, tokenId);
        tokenOfWallet[wallet]  = tokenId;
        reputation[tokenId]    = ReputationData({
            score:        score,
            totalVotes:   totalVotes,
            correctCalls: correctCalls,
            streakDays:   streakDays,
            lastUpdated:  uint64(block.timestamp)
        });
        emit ReputationMinted(wallet, tokenId);
    }

    function updateReputation(
        address wallet,
        uint8   score,
        uint32  totalVotes,
        uint32  correctCalls,
        uint32  streakDays
    ) external onlyOwner {
        uint256 tokenId = tokenOfWallet[wallet];
        if (tokenId == 0) revert NotYetMinted();
        reputation[tokenId] = ReputationData({
            score:        score,
            totalVotes:   totalVotes,
            correctCalls: correctCalls,
            streakDays:   streakDays,
            lastUpdated:  uint64(block.timestamp)
        });
        emit ReputationUpdated(wallet, tokenId, score);
    }

    function getReputation(address wallet) external view returns (ReputationData memory) {
        uint256 tokenId = tokenOfWallet[wallet];
        return reputation[tokenId];
    }

    // ── Soulbound: block all transfers ──────────────────────────────────────────
    function transferFrom(address, address, uint256) public pure override {
        revert Soulbound();
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert Soulbound();
    }
}
