// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// ─────────────────────────────────────────────────────────────────────────────
// ConvictionToken
// ─────────────────────────────────────────────────────────────────────────────

/// @title ConvictionToken
/// @notice ERC-20 minted on a bonding curve when a pitchdrop idea wins its
///         69-hour voting window. Only the immutable `minter` address may
///         create new tokens, up to MAX_SUPPLY.
contract ConvictionToken is ERC20 {
    // ── Errors ────────────────────────────────────────────────────────────────
    error NotMinter();
    error CapExceeded();

    // ── Constants ─────────────────────────────────────────────────────────────
    /// @notice 1 billion tokens (18 decimals).
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 1e18;

    // ── Immutables ────────────────────────────────────────────────────────────
    /// @notice The sole address authorised to call `mint`.
    address public immutable minter;

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(
        string memory name_,
        string memory symbol_,
        address minter_
    ) ERC20(name_, symbol_) {
        minter = minter_;
    }

    // ── Mint ──────────────────────────────────────────────────────────────────
    /// @notice Mint `amount` tokens to `to`. Reverts if caller is not `minter`
    ///         or if the mint would exceed MAX_SUPPLY.
    function mint(address to, uint256 amount) external {
        if (msg.sender != minter) revert NotMinter();
        if (totalSupply() + amount > MAX_SUPPLY) revert CapExceeded();
        _mint(to, amount);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ConvictionTokenFactory
// ─────────────────────────────────────────────────────────────────────────────

/// @title ConvictionTokenFactory
/// @notice Deploys one ConvictionToken per winning idea and acts as its minter.
///
///         The factory exposes two launch paths:
///
///         (A) `launch(ideaId, name, symbol)` — standalone token.
///             Owner calls `mint(ideaId, to, amount)` to issue tokens.
///
///         (B) `launchWithCurve(ideaId, name, symbol, buildFund)` — deploys
///             token + BondingCurve atomically. The factory registers the curve
///             so `mintForCurve` (called by BondingCurve.buy) is authorised.
///
///         The factory is always the ERC-20 minter; BondingCurve routes its
///         mint calls through `mintForCurve`, which validates the caller is the
///         registered curve for that token before relaying to the token.
contract ConvictionTokenFactory is Ownable {
    // ── State ─────────────────────────────────────────────────────────────────
    /// @notice ideaId → ConvictionToken address.
    mapping(uint256 => address) public tokenForIdea;

    /// @notice token address → the one BondingCurve authorised to mint for it.
    mapping(address => address) internal _authorisedCurve;

    // ── Events ────────────────────────────────────────────────────────────────
    event TokenLaunched(uint256 indexed ideaId, address token);

    // ── Errors ────────────────────────────────────────────────────────────────
    error AlreadyLaunched();
    error NotAuthorisedCurve();

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ── Launch: token only ────────────────────────────────────────────────────
    /// @notice Deploy a ConvictionToken for `ideaId`; factory is the minter.
    function launch(
        uint256 ideaId,
        string calldata name,
        string calldata symbol
    ) external onlyOwner returns (address token) {
        if (tokenForIdea[ideaId] != address(0)) revert AlreadyLaunched();
        token = address(new ConvictionToken(name, symbol, address(this)));
        tokenForIdea[ideaId] = token;
        emit TokenLaunched(ideaId, token);
    }

    // ── Mint (owner-gated, token-only path) ───────────────────────────────────
    /// @notice Mint tokens for an idea launched via `launch()`. Owner only.
    function mint(uint256 ideaId, address to, uint256 amount) external onlyOwner {
        ConvictionToken(tokenForIdea[ideaId]).mint(to, amount);
    }

    // ── Mint relay for BondingCurve ───────────────────────────────────────────
    /// @notice Called by the registered BondingCurve for `token` during buy().
    ///         Only the curve registered via `_registerCurve` may call this.
    function mintForCurve(address token, address to, uint256 amount) external {
        if (_authorisedCurve[token] != msg.sender) revert NotAuthorisedCurve();
        ConvictionToken(token).mint(to, amount);
    }

    // ── Internal: register a curve ────────────────────────────────────────────
    /// @dev Called by BondingCurveFactory (a trusted subclass / sibling) to
    ///      wire a curve to its token after both are deployed. We expose this
    ///      as an internal function; BondingCurveFactory overrides or calls it
    ///      depending on the inheritance model chosen.
    ///
    ///      Since Solidity single-inheritance prevents two separate factory
    ///      contracts from sharing this internal, we expose it as `onlyOwner`
    ///      external so the deployer can wire them, OR we combine both factories
    ///      into one contract.
    ///
    ///      Final design: expose as `external onlyOwner` so that the combined
    ///      factory (BondingCurveFactory extends this) or the test can call it.
    function registerCurve(address token, address curve) external onlyOwner {
        _authorisedCurve[token] = curve;
    }
}
