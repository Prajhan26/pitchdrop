// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IConvictionToken {
    function mint(address to, uint256 amount) external;
}

/// @title AirdropDistributor
/// @notice Merkle-tree based claim for ConvictionToken distributions to YES voters (by tier).
contract AirdropDistributor is Ownable {
    // ideaId => merkle root (set by owner after computing off-chain)
    mapping(uint256 => bytes32) public merkleRoots;
    // ideaId => claimer => claimed
    mapping(uint256 => mapping(address => bool)) public claimed;

    event RootSet(uint256 indexed ideaId, bytes32 root);
    event Claimed(uint256 indexed ideaId, address indexed claimer, uint256 amount);

    error AlreadyClaimed();
    error InvalidProof();
    error NoRootSet();

    constructor() Ownable(msg.sender) {}

    function setMerkleRoot(uint256 ideaId, bytes32 root) external onlyOwner {
        merkleRoots[ideaId] = root;
        emit RootSet(ideaId, root);
    }

    function claim(
        uint256 ideaId,
        address token,
        uint256 amount,
        bytes32[] calldata proof
    ) external {
        bytes32 root = merkleRoots[ideaId];
        if (root == bytes32(0))                         revert NoRootSet();
        if (claimed[ideaId][msg.sender])                revert AlreadyClaimed();

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
        if (!MerkleProof.verify(proof, root, leaf))     revert InvalidProof();

        claimed[ideaId][msg.sender] = true;
        IConvictionToken(token).mint(msg.sender, amount);
        emit Claimed(ideaId, msg.sender, amount);
    }

    function hasClaimed(uint256 ideaId, address claimer) external view returns (bool) {
        return claimed[ideaId][claimer];
    }
}
