// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ConvictionToken.sol";

// ─────────────────────────────────────────────────────────────────────────────
// BondingCurve
// ─────────────────────────────────────────────────────────────────────────────

/// @title BondingCurve
/// @notice Linear bonding curve for a single pitchdrop idea's ConvictionToken.
///         Buyers send ETH and receive tokens at a price that rises linearly
///         with supply. When cumulative ETH raised reaches GRADUATION_TARGET
///         the curve graduates and sends 15 % of the raise to the buildFund.
///
///         Minting is relayed through the ConvictionTokenFactory because the
///         factory is the token's immutable minter. The factory's `mintForCurve`
///         validates that only this contract may call it for this token.
contract BondingCurve {
    // ── Immutables ────────────────────────────────────────────────────────────
    ConvictionToken          public immutable token;
    ConvictionTokenFactory   public immutable factory;
    address                  public immutable buildFund;
    uint256                  public immutable ideaId;

    // ── Constants ─────────────────────────────────────────────────────────────
    /// @notice ETH target that triggers graduation (~$69 K at $3 450 / ETH).
    uint256 public constant GRADUATION_TARGET = 20 ether;

    /// @notice Portion of raised ETH sent to the buildFund on graduation (15 %).
    uint256 public constant BUILD_FUND_BPS = 1_500;

    /// @notice Starting price: 0.0001 ETH per 1e18 tokens at zero supply.
    uint256 public constant BASE_PRICE = 0.0001 ether;

    /// @notice Mirror of ConvictionToken.MAX_SUPPLY for price calculations.
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 1e18;

    // ── State ─────────────────────────────────────────────────────────────────
    uint256 public totalRaised;
    bool    public graduated;

    // ── Events ────────────────────────────────────────────────────────────────
    event Bought(
        address indexed buyer,
        uint256 ethIn,
        uint256 tokensOut,
        uint256 newTotalRaised
    );
    event Graduated(uint256 totalRaised, uint256 buildFundShare);

    // ── Errors ────────────────────────────────────────────────────────────────
    error AlreadyGraduated();
    error SlippageExceeded();
    error ZeroValue();

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(
        uint256 ideaId_,
        address token_,
        address buildFund_,
        address factory_
    ) {
        ideaId    = ideaId_;
        token     = ConvictionToken(token_);
        buildFund = buildFund_;
        factory   = ConvictionTokenFactory(factory_);
    }

    // ── Buy ───────────────────────────────────────────────────────────────────

    /// @notice Buy tokens by sending ETH.
    /// @param minTokensOut Minimum tokens to receive (slippage guard).
    function buy(uint256 minTokensOut) external payable {
        if (graduated)      revert AlreadyGraduated();
        if (msg.value == 0) revert ZeroValue();

        uint256 tokensOut = getTokensForEth(msg.value);
        if (tokensOut < minTokensOut) revert SlippageExceeded();

        totalRaised += msg.value;

        // Relay mint through factory (factory is the token's immutable minter).
        factory.mintForCurve(address(token), msg.sender, tokensOut);

        emit Bought(msg.sender, msg.value, tokensOut, totalRaised);

        if (totalRaised >= GRADUATION_TARGET) _graduate();
    }

    // ── Price view helpers ────────────────────────────────────────────────────

    /// @notice Estimate tokens received for `ethAmount` ETH at current supply.
    ///         Uses a linear bonding curve:
    ///             price = BASE_PRICE * (1 + supply / MAX_SUPPLY)
    function getTokensForEth(uint256 ethAmount) public view returns (uint256) {
        uint256 supply = token.totalSupply();
        uint256 price  = BASE_PRICE + (BASE_PRICE * supply / MAX_SUPPLY);
        return ethAmount * 1e18 / price;
    }

    /// @notice Estimate ETH cost to acquire `tokenAmount` tokens at current supply.
    function getEthForTokens(uint256 tokenAmount) public view returns (uint256) {
        uint256 supply = token.totalSupply();
        uint256 price  = BASE_PRICE + (BASE_PRICE * supply / MAX_SUPPLY);
        return tokenAmount * price / 1e18;
    }

    // ── Graduation ────────────────────────────────────────────────────────────

    function _graduate() internal {
        graduated = true;
        uint256 buildFundShare = (totalRaised * BUILD_FUND_BPS) / 10_000;
        (bool ok,) = buildFund.call{value: buildFundShare}("");
        require(ok, "buildFund transfer failed");
        emit Graduated(totalRaised, buildFundShare);
    }

    receive() external payable {}
}

// ─────────────────────────────────────────────────────────────────────────────
// BondingCurveFactory
// ─────────────────────────────────────────────────────────────────────────────

/// @title BondingCurveFactory
/// @notice Deploys one BondingCurve per winning idea and wires it to the
///         ConvictionTokenFactory so the curve can mint tokens during buy().
///
///         Typical flow:
///           1. Owner calls `ConvictionTokenFactory.launch(ideaId, name, sym)`
///              to deploy the ERC-20.
///           2. Owner calls `BondingCurveFactory.launch(ideaId, token, buildFund,
///              tokenFactory)` to deploy the curve and register it.
///
///         Alternatively use `launchAll` for a single atomic transaction.
contract BondingCurveFactory is Ownable {
    // ── State ─────────────────────────────────────────────────────────────────
    /// @notice ideaId → BondingCurve address.
    mapping(uint256 => address) public curveForIdea;

    // ── Events ────────────────────────────────────────────────────────────────
    event CurveLaunched(uint256 indexed ideaId, address curve, address token);

    // ── Errors ────────────────────────────────────────────────────────────────
    error AlreadyLaunched();

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ── Launch: curve only ────────────────────────────────────────────────────

    /// @notice Deploy a BondingCurve for an already-deployed ConvictionToken.
    ///         Registers the curve with the token factory so `mintForCurve`
    ///         will be authorised.
    /// @param token        Address of the deployed ConvictionToken.
    /// @param buildFund    Address that receives the 15 % graduation fee.
    /// @param tokenFactory The ConvictionTokenFactory whose `registerCurve` and
    ///                     `mintForCurve` will be used.
    function launch(
        uint256 ideaId,
        address token,
        address buildFund,
        address tokenFactory
    ) external onlyOwner returns (address curve) {
        if (curveForIdea[ideaId] != address(0)) revert AlreadyLaunched();

        curve = address(new BondingCurve(ideaId, token, buildFund, tokenFactory));
        curveForIdea[ideaId] = curve;

        // Register the new curve as the authorised minter-relay for this token.
        ConvictionTokenFactory(tokenFactory).registerCurve(token, curve);

        emit CurveLaunched(ideaId, curve, token);
    }

    // ── Launch: token + curve atomically ──────────────────────────────────────

    /// @notice Deploy a ConvictionToken AND BondingCurve in one transaction.
    ///         The supplied `tokenFactory` must be owned by the same owner as
    ///         this contract (or this contract must be the owner of it).
    function launchAll(
        uint256 ideaId,
        string calldata name,
        string calldata symbol,
        address buildFund,
        address tokenFactory
    ) external onlyOwner returns (address token, address curve) {
        // Deploy token via the token factory.
        token = ConvictionTokenFactory(tokenFactory).launch(ideaId, name, symbol);

        // Deploy curve and register it.
        curve = this.launch(ideaId, token, buildFund, tokenFactory);
    }
}
