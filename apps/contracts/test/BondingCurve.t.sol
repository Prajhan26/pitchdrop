// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ConvictionToken.sol";
import "../src/BondingCurve.sol";

/// @title BondingCurve Tests
/// @notice Covers BondingCurve buying mechanics, price curve, graduation,
///         build-fund payout, and error cases.
contract BondingCurveTest is Test {
    // ── Actors ────────────────────────────────────────────────────────────────
    address owner     = makeAddr("owner");
    address alice     = makeAddr("alice");
    address bob       = makeAddr("bob");
    address buildFund = makeAddr("buildFund");

    // ── Contracts ─────────────────────────────────────────────────────────────
    ConvictionTokenFactory tokenFactory;
    BondingCurveFactory    curveFactory;
    BondingCurve           curve;
    ConvictionToken        token;

    uint256 constant IDEA_ID = 1;

    // ── Setup ─────────────────────────────────────────────────────────────────
    function setUp() public {
        vm.startPrank(owner);

        // Deploy factories.
        tokenFactory = new ConvictionTokenFactory();
        curveFactory = new BondingCurveFactory();

        // Deploy token via tokenFactory.
        address tokenAddr = tokenFactory.launch(IDEA_ID, "PitchCoin", "PITCH");
        token = ConvictionToken(tokenAddr);

        // Transfer tokenFactory ownership to curveFactory so that
        // curveFactory.launch() can call tokenFactory.registerCurve().
        tokenFactory.transferOwnership(address(curveFactory));

        // Deploy curve via curveFactory (also registers curve with tokenFactory).
        address curveAddr = curveFactory.launch(
            IDEA_ID,
            tokenAddr,
            buildFund,
            address(tokenFactory)
        );
        curve = BondingCurve(payable(curveAddr));

        vm.stopPrank();

        // Fund actors.
        vm.deal(alice, 100 ether);
        vm.deal(bob,   100 ether);
    }

    // =========================================================================
    // 1. Buy tokens: buyer receives tokens, totalRaised increases
    // =========================================================================
    function test_buy_receivesTokens_updatesTotalRaised() public {
        uint256 ethIn = 1 ether;
        uint256 expectedTokens = curve.getTokensForEth(ethIn);

        vm.prank(alice);
        curve.buy{value: ethIn}(0);

        assertEq(token.balanceOf(alice), expectedTokens);
        assertEq(curve.totalRaised(),    ethIn);
    }

    // =========================================================================
    // 2. getTokensForEth returns non-zero for non-zero ETH
    // =========================================================================
    function test_getTokensForEth_nonZero() public view {
        uint256 tokens = curve.getTokensForEth(1 ether);
        assertGt(tokens, 0);
    }

    // =========================================================================
    // 3. Price increases as supply grows (second buy yields fewer tokens)
    // =========================================================================
    function test_price_increasesWithSupply() public {
        uint256 ethIn = 1 ether;

        // First buy at zero supply.
        uint256 tokensFirst = curve.getTokensForEth(ethIn);
        vm.prank(alice);
        curve.buy{value: ethIn}(0);

        // Second buy at higher supply.
        uint256 tokensSecond = curve.getTokensForEth(ethIn);

        assertLt(tokensSecond, tokensFirst, "price should rise after first buy");
    }

    // =========================================================================
    // 4. Second buyer gets fewer tokens than first buyer for the same ETH
    // =========================================================================
    function test_buy_secondBuyerFewerTokens() public {
        vm.prank(alice);
        curve.buy{value: 1 ether}(0);

        uint256 aliceTokens = token.balanceOf(alice);

        vm.prank(bob);
        curve.buy{value: 1 ether}(0);

        uint256 bobTokens = token.balanceOf(bob);

        assertLt(bobTokens, aliceTokens, "bob should receive fewer tokens than alice");
    }

    // =========================================================================
    // 5. getEthForTokens is consistent with getTokensForEth at same supply
    // =========================================================================
    function test_getEthForTokens_consistent() public view {
        uint256 ethIn     = 1 ether;
        uint256 tokens    = curve.getTokensForEth(ethIn);
        uint256 ethBack   = curve.getEthForTokens(tokens);
        // Allow tiny rounding error (within 0.01 %).
        assertApproxEqRel(ethBack, ethIn, 0.0001e18);
    }

    // =========================================================================
    // 6. Graduation triggers at GRADUATION_TARGET
    // =========================================================================
    function test_buy_graduatesAtTarget() public {
        uint256 target = curve.GRADUATION_TARGET(); // 20 ether

        vm.deal(alice, target + 1 ether);
        vm.prank(alice);
        curve.buy{value: target}(0);

        assertTrue(curve.graduated(), "curve should be graduated");
    }

    // =========================================================================
    // 7. buildFund receives 15 % on graduation
    // =========================================================================
    function test_graduation_buildFundReceives15pct() public {
        uint256 target = curve.GRADUATION_TARGET();
        uint256 expectedShare = (target * curve.BUILD_FUND_BPS()) / 10_000;

        uint256 buildFundBefore = buildFund.balance;

        vm.deal(alice, target + 1 ether);
        vm.prank(alice);
        curve.buy{value: target}(0);

        uint256 buildFundAfter = buildFund.balance;
        assertEq(buildFundAfter - buildFundBefore, expectedShare);
    }

    // =========================================================================
    // 8. AlreadyGraduated reverts after graduation
    // =========================================================================
    function test_buy_afterGraduation_reverts_AlreadyGraduated() public {
        uint256 target = curve.GRADUATION_TARGET();

        vm.deal(alice, target + 10 ether);
        vm.prank(alice);
        curve.buy{value: target}(0);

        assertTrue(curve.graduated());

        vm.prank(bob);
        vm.expectRevert(BondingCurve.AlreadyGraduated.selector);
        curve.buy{value: 1 ether}(0);
    }

    // =========================================================================
    // 9. ZeroValue reverts when buying with 0 ETH
    // =========================================================================
    function test_buy_zeroEth_reverts_ZeroValue() public {
        vm.prank(alice);
        vm.expectRevert(BondingCurve.ZeroValue.selector);
        curve.buy{value: 0}(0);
    }

    // =========================================================================
    // 10. SlippageExceeded when minTokensOut is too high
    // =========================================================================
    function test_buy_slippage_reverts_SlippageExceeded() public {
        uint256 ethIn = 1 ether;
        uint256 expected = curve.getTokensForEth(ethIn);

        vm.prank(alice);
        vm.expectRevert(BondingCurve.SlippageExceeded.selector);
        curve.buy{value: ethIn}(expected + 1);
    }

    // =========================================================================
    // 11. BondingCurveFactory: cannot launch same ideaId twice
    // =========================================================================
    function test_curveFactory_alreadyLaunched_reverts() public {
        // setUp already launched ideaId = 1.
        vm.prank(owner);
        vm.expectRevert(BondingCurveFactory.AlreadyLaunched.selector);
        curveFactory.launch(IDEA_ID, address(token), buildFund, address(tokenFactory));
    }

    // =========================================================================
    // 12. BondingCurveFactory: curveForIdea mapping is populated
    // =========================================================================
    function test_curveFactory_curveForIdeaPopulated() public view {
        assertEq(curveFactory.curveForIdea(IDEA_ID), address(curve));
    }

    // =========================================================================
    // 13. Emits Bought event on successful buy
    // =========================================================================
    function test_buy_emitsBoughtEvent() public {
        uint256 ethIn = 0.5 ether;
        uint256 expectedTokens = curve.getTokensForEth(ethIn);

        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit BondingCurve.Bought(alice, ethIn, expectedTokens, ethIn);
        curve.buy{value: ethIn}(0);
    }

    // =========================================================================
    // 14. Emits Graduated event on graduation
    // =========================================================================
    function test_buy_emitsGraduatedEvent() public {
        uint256 target = curve.GRADUATION_TARGET();
        uint256 expectedShare = (target * curve.BUILD_FUND_BPS()) / 10_000;

        vm.deal(alice, target + 1 ether);
        vm.prank(alice);
        vm.expectEmit(false, false, false, true);
        emit BondingCurve.Graduated(target, expectedShare);
        curve.buy{value: target}(0);
    }

    // =========================================================================
    // 15. totalRaised accumulates across multiple buys
    // =========================================================================
    function test_totalRaised_accumulatesAcrossBuys() public {
        vm.prank(alice);
        curve.buy{value: 1 ether}(0);

        vm.prank(bob);
        curve.buy{value: 2 ether}(0);

        assertEq(curve.totalRaised(), 3 ether);
    }
}
