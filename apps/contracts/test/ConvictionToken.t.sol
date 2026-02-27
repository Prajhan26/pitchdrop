// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ConvictionToken.sol";

/// @title ConvictionToken Tests
/// @notice Covers ConvictionToken (ERC-20) and ConvictionTokenFactory behaviours.
contract ConvictionTokenTest is Test {
    // ── Actors ────────────────────────────────────────────────────────────────
    address owner   = makeAddr("owner");
    address alice   = makeAddr("alice");
    address bob     = makeAddr("bob");
    address charlie = makeAddr("charlie");

    // ── Contracts ─────────────────────────────────────────────────────────────
    ConvictionTokenFactory factory;

    // ── Setup ─────────────────────────────────────────────────────────────────
    function setUp() public {
        vm.prank(owner);
        factory = new ConvictionTokenFactory();
    }

    // =========================================================================
    // 1. Factory: launch stores mapping and emits TokenLaunched
    // =========================================================================
    function test_launch_storesMapping_emitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, false); // don't check data — token addr is dynamic
        emit ConvictionTokenFactory.TokenLaunched(1, address(0));

        address token = factory.launch(1, "IdeaOne", "IDEA1");

        assertEq(factory.tokenForIdea(1), token);
        assertTrue(token != address(0));
    }

    // =========================================================================
    // 2. Factory: launching same ideaId twice reverts with AlreadyLaunched
    // =========================================================================
    function test_launch_sameIdea_reverts_AlreadyLaunched() public {
        vm.startPrank(owner);
        factory.launch(1, "IdeaOne", "IDEA1");

        vm.expectRevert(ConvictionTokenFactory.AlreadyLaunched.selector);
        factory.launch(1, "IdeaOneDup", "DUP");
        vm.stopPrank();
    }

    // =========================================================================
    // 3. Factory: non-owner cannot launch
    // =========================================================================
    function test_launch_nonOwner_reverts() public {
        vm.prank(alice);
        vm.expectRevert();
        factory.launch(2, "IdeaTwo", "IDEA2");
    }

    // =========================================================================
    // 4. Token: correct name and symbol
    // =========================================================================
    function test_token_nameAndSymbol() public {
        vm.prank(owner);
        address tokenAddr = factory.launch(1, "PitchDrop Alpha", "PDAL");
        ConvictionToken token = ConvictionToken(tokenAddr);

        assertEq(token.name(), "PitchDrop Alpha");
        assertEq(token.symbol(), "PDAL");
    }

    // =========================================================================
    // 5. Token: minter is correctly set to factory
    // =========================================================================
    function test_token_minterIsFactory() public {
        vm.prank(owner);
        address tokenAddr = factory.launch(1, "Idea", "IDEA");
        ConvictionToken token = ConvictionToken(tokenAddr);

        assertEq(token.minter(), address(factory));
    }

    // =========================================================================
    // 6. Factory: owner can mint via factory.mint()
    // =========================================================================
    function test_mint_ownerSucceeds() public {
        vm.startPrank(owner);
        factory.launch(1, "Idea", "IDEA");
        factory.mint(1, alice, 1_000 * 1e18);
        vm.stopPrank();

        ConvictionToken token = ConvictionToken(factory.tokenForIdea(1));
        assertEq(token.balanceOf(alice), 1_000 * 1e18);
    }

    // =========================================================================
    // 7. Token: direct mint from non-minter reverts with NotMinter
    // =========================================================================
    function test_mint_nonMinter_reverts_NotMinter() public {
        vm.prank(owner);
        address tokenAddr = factory.launch(1, "Idea", "IDEA");
        ConvictionToken token = ConvictionToken(tokenAddr);

        vm.prank(alice);
        vm.expectRevert(ConvictionToken.NotMinter.selector);
        token.mint(alice, 1e18);
    }

    // =========================================================================
    // 8. Token: minting beyond MAX_SUPPLY reverts with CapExceeded
    // =========================================================================
    function test_mint_exceedsCap_reverts_CapExceeded() public {
        vm.startPrank(owner);
        factory.launch(1, "Idea", "IDEA");

        uint256 maxSupply = ConvictionToken(factory.tokenForIdea(1)).MAX_SUPPLY();

        // Mint exactly at cap — should succeed.
        factory.mint(1, alice, maxSupply);
        vm.stopPrank();

        ConvictionToken token = ConvictionToken(factory.tokenForIdea(1));
        assertEq(token.totalSupply(), maxSupply);

        // Attempting to mint 1 more should revert.
        vm.prank(owner);
        vm.expectRevert(ConvictionToken.CapExceeded.selector);
        factory.mint(1, alice, 1);
    }

    // =========================================================================
    // 9. Token: transferable (normal ERC-20 behaviour)
    // =========================================================================
    function test_token_transferable() public {
        vm.startPrank(owner);
        factory.launch(1, "Idea", "IDEA");
        factory.mint(1, alice, 500 * 1e18);
        vm.stopPrank();

        ConvictionToken token = ConvictionToken(factory.tokenForIdea(1));

        vm.prank(alice);
        token.transfer(bob, 200 * 1e18);

        assertEq(token.balanceOf(alice), 300 * 1e18);
        assertEq(token.balanceOf(bob),   200 * 1e18);
    }

    // =========================================================================
    // 10. Token: approve + transferFrom works
    // =========================================================================
    function test_token_approveAndTransferFrom() public {
        vm.startPrank(owner);
        factory.launch(1, "Idea", "IDEA");
        factory.mint(1, alice, 1_000 * 1e18);
        vm.stopPrank();

        ConvictionToken token = ConvictionToken(factory.tokenForIdea(1));

        vm.prank(alice);
        token.approve(bob, 400 * 1e18);

        vm.prank(bob);
        token.transferFrom(alice, charlie, 400 * 1e18);

        assertEq(token.balanceOf(alice),   600 * 1e18);
        assertEq(token.balanceOf(charlie), 400 * 1e18);
    }

    // =========================================================================
    // 11. Factory: multiple ideas can be launched independently
    // =========================================================================
    function test_launch_multipleIdeas() public {
        vm.startPrank(owner);
        address token1 = factory.launch(1, "Alpha", "ALPHA");
        address token2 = factory.launch(2, "Beta",  "BETA");
        vm.stopPrank();

        assertTrue(token1 != token2);
        assertEq(factory.tokenForIdea(1), token1);
        assertEq(factory.tokenForIdea(2), token2);
    }

    // =========================================================================
    // 12. Factory: registerCurve + mintForCurve authorisation
    // =========================================================================
    function test_registerCurve_mintForCurve_authorised() public {
        vm.startPrank(owner);
        address tokenAddr = factory.launch(1, "Idea", "IDEA");
        // Register alice as the "curve" for this token.
        factory.registerCurve(tokenAddr, alice);
        vm.stopPrank();

        // alice (the "curve") should now be able to mintForCurve.
        vm.prank(alice);
        factory.mintForCurve(tokenAddr, bob, 100 * 1e18);

        assertEq(ConvictionToken(tokenAddr).balanceOf(bob), 100 * 1e18);
    }

    // =========================================================================
    // 13. Factory: mintForCurve reverts if caller is not the registered curve
    // =========================================================================
    function test_mintForCurve_wrongCaller_reverts() public {
        vm.startPrank(owner);
        address tokenAddr = factory.launch(1, "Idea", "IDEA");
        factory.registerCurve(tokenAddr, alice);
        vm.stopPrank();

        vm.prank(charlie); // charlie is not the curve
        vm.expectRevert(ConvictionTokenFactory.NotAuthorisedCurve.selector);
        factory.mintForCurve(tokenAddr, bob, 100 * 1e18);
    }

    // =========================================================================
    // 14. Token: MAX_SUPPLY constant is 1 billion tokens
    // =========================================================================
    function test_token_maxSupplyConstant() public {
        vm.prank(owner);
        address tokenAddr = factory.launch(1, "Idea", "IDEA");
        assertEq(ConvictionToken(tokenAddr).MAX_SUPPLY(), 1_000_000_000 * 1e18);
    }
}
