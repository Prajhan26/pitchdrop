// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AirdropDistributor.sol";

// ── Minimal mock ConvictionToken ──────────────────────────────────────────────
contract MockConvictionToken {
    mapping(address => uint256) public minted;

    function mint(address to, uint256 amount) external {
        minted[to] += amount;
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────
contract AirdropDistributorTest is Test {
    AirdropDistributor  public distributor;
    MockConvictionToken public token;

    address public owner;
    address public claimer;
    address public other;

    uint256 constant IDEA_ID = 1;
    uint256 constant AMOUNT  = 1000e18;

    // Merkle helpers ──────────────────────────────────────────────────────────
    // For a single-leaf tree the root IS the leaf.
    bytes32 internal leafHash;
    bytes32 internal merkleRoot;

    function setUp() public {
        owner    = address(this);
        claimer  = makeAddr("claimer");
        other    = makeAddr("other");

        distributor = new AirdropDistributor();
        token       = new MockConvictionToken();

        // Build a minimal single-leaf Merkle tree for (claimer, AMOUNT).
        leafHash   = keccak256(abi.encodePacked(claimer, AMOUNT));
        merkleRoot = leafHash; // single-leaf root == leaf
    }

    // ── 1. setMerkleRoot stores root and emits event ──────────────────────────

    function test_setMerkleRootStoresRoot() public {
        distributor.setMerkleRoot(IDEA_ID, merkleRoot);
        assertEq(distributor.merkleRoots(IDEA_ID), merkleRoot);
    }

    function test_setMerkleRootEmitsEvent() public {
        vm.expectEmit(true, false, false, true, address(distributor));
        emit AirdropDistributor.RootSet(IDEA_ID, merkleRoot);
        distributor.setMerkleRoot(IDEA_ID, merkleRoot);
    }

    // ── 2. claim with valid proof mints tokens and marks claimed ──────────────

    function test_claimValidProofMintsTokens() public {
        distributor.setMerkleRoot(IDEA_ID, merkleRoot);

        // Single-leaf proof is empty []
        bytes32[] memory proof = new bytes32[](0);

        vm.prank(claimer);
        distributor.claim(IDEA_ID, address(token), AMOUNT, proof);

        assertEq(token.minted(claimer), AMOUNT);
    }

    function test_claimMarksClaimed() public {
        distributor.setMerkleRoot(IDEA_ID, merkleRoot);
        bytes32[] memory proof = new bytes32[](0);

        assertFalse(distributor.hasClaimed(IDEA_ID, claimer));

        vm.prank(claimer);
        distributor.claim(IDEA_ID, address(token), AMOUNT, proof);

        assertTrue(distributor.hasClaimed(IDEA_ID, claimer));
    }

    function test_claimEmitsEvent() public {
        distributor.setMerkleRoot(IDEA_ID, merkleRoot);
        bytes32[] memory proof = new bytes32[](0);

        vm.expectEmit(true, true, false, true, address(distributor));
        emit AirdropDistributor.Claimed(IDEA_ID, claimer, AMOUNT);

        vm.prank(claimer);
        distributor.claim(IDEA_ID, address(token), AMOUNT, proof);
    }

    // ── 3. AlreadyClaimed on double claim ─────────────────────────────────────

    function test_alreadyClaimedReverts() public {
        distributor.setMerkleRoot(IDEA_ID, merkleRoot);
        bytes32[] memory proof = new bytes32[](0);

        vm.startPrank(claimer);
        distributor.claim(IDEA_ID, address(token), AMOUNT, proof);

        vm.expectRevert(AirdropDistributor.AlreadyClaimed.selector);
        distributor.claim(IDEA_ID, address(token), AMOUNT, proof);
        vm.stopPrank();
    }

    // ── 4. InvalidProof on bad proof ──────────────────────────────────────────

    function test_invalidProofReverts() public {
        distributor.setMerkleRoot(IDEA_ID, merkleRoot);

        // Supply a non-empty garbage proof so the leaf doesn't equal the root
        bytes32[] memory badProof = new bytes32[](1);
        badProof[0] = bytes32(uint256(0xDEAD));

        vm.prank(claimer);
        vm.expectRevert(AirdropDistributor.InvalidProof.selector);
        distributor.claim(IDEA_ID, address(token), AMOUNT, badProof);
    }

    function test_wrongAmountReverts() public {
        distributor.setMerkleRoot(IDEA_ID, merkleRoot);
        bytes32[] memory proof = new bytes32[](0);

        // Use wrong amount — leaf won't match
        vm.prank(claimer);
        vm.expectRevert(AirdropDistributor.InvalidProof.selector);
        distributor.claim(IDEA_ID, address(token), AMOUNT + 1, proof);
    }

    // ── 5. NoRootSet when root is zero ────────────────────────────────────────

    function test_noRootSetReverts() public {
        bytes32[] memory proof = new bytes32[](0);

        vm.prank(claimer);
        vm.expectRevert(AirdropDistributor.NoRootSet.selector);
        distributor.claim(IDEA_ID, address(token), AMOUNT, proof);
    }

    // ── 6. hasClaimed returns correct values ──────────────────────────────────

    function test_hasClaimedReturnsFalseBeforeClaim() public {
        assertFalse(distributor.hasClaimed(IDEA_ID, claimer));
        assertFalse(distributor.hasClaimed(IDEA_ID, other));
    }

    function test_hasClaimedReturnsTrueAfterClaim() public {
        distributor.setMerkleRoot(IDEA_ID, merkleRoot);
        bytes32[] memory proof = new bytes32[](0);

        vm.prank(claimer);
        distributor.claim(IDEA_ID, address(token), AMOUNT, proof);

        assertTrue(distributor.hasClaimed(IDEA_ID, claimer));
        // Other claimer should still be false
        assertFalse(distributor.hasClaimed(IDEA_ID, other));
    }

    // ── 7. Two-leaf Merkle tree claim ─────────────────────────────────────────
    // OZ MerkleProof uses commutativeKeccak256 (sorts then hashes with abi.encode).

    function _commutativeKeccak256(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encode(a, b)) : keccak256(abi.encode(b, a));
    }

    function test_claimWithTwoLeafTree() public {
        uint256 amountA = 500e18;
        uint256 amountB = 750e18;

        bytes32 leafA = keccak256(abi.encodePacked(claimer, amountA));
        bytes32 leafB = keccak256(abi.encodePacked(other,   amountB));

        // Root uses the commutative sort-and-hash matching OZ's Hashes library.
        bytes32 root = _commutativeKeccak256(leafA, leafB);

        bytes32[] memory proofA = new bytes32[](1);
        bytes32[] memory proofB = new bytes32[](1);
        proofA[0] = leafB;
        proofB[0] = leafA;

        distributor.setMerkleRoot(IDEA_ID, root);

        vm.prank(claimer);
        distributor.claim(IDEA_ID, address(token), amountA, proofA);
        assertEq(token.minted(claimer), amountA);

        vm.prank(other);
        distributor.claim(IDEA_ID, address(token), amountB, proofB);
        assertEq(token.minted(other), amountB);
    }

    // ── 8. onlyOwner guard on setMerkleRoot ───────────────────────────────────

    function test_strangerCannotSetRoot() public {
        vm.prank(other);
        vm.expectRevert();
        distributor.setMerkleRoot(IDEA_ID, merkleRoot);
    }
}
