// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.5;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol';

import '../interfaces/IAsset.sol';

/**
 * @title Asset
 * @notice Contract presenting an asset in a pool
 * @dev Expect to be owned by Timelock for management, and pool links to Pool for coordination
 */
contract Asset is Ownable, Initializable, ERC20, ERC20Permit, IAsset {
    using SafeERC20 for IERC20;

    /// @notice The underlying underlyingToken represented by this asset
    address public override underlyingToken;
    /// @notice The Pool
    address public override pool;
    /// @notice Cash balance, normally it should align with IERC20(underlyingToken).balanceOf(address(this))
    uint256 public override cash;
    /// @notice Total liability, equals to the sum of deposit and dividend
    uint256 public override liability;
    /// @notice maxSupply the maximum amount of asset the pool is allowed to mint. The unit is the same as the underlying token
    /// @dev if 0, means asset has no max
    uint256 public maxSupply;

    /// @notice An event thats emitted when max supply is updated
    event MaxSupplyUpdated(uint256 previousMaxSupply, uint256 newMaxSupply);

    /// @notice An event thats emitted when pool address is updated
    event PoolUpdated(address previousPoolAddr, address newPoolAddr);

    error WOMBAT_FORBIDDEN();

    /// @dev Modifier ensuring that certain function can only be called by pool
    modifier onlyPool() {
        if (msg.sender != pool) revert WOMBAT_FORBIDDEN();
        _;
    }

    /**
     * @notice Constructor.
     * @param underlyingToken_ The token represented by the asset
     * @param name_ The name of the asset
     * @param symbol_ The symbol of the asset
     */
    constructor(
        address underlyingToken_,
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) ERC20Permit(name_) {
        initialize(underlyingToken_);
    }

    /**
     * @notice Initializer.
     * @dev _ suffix to avoid shadowing underlyingToken() name and  symbol
     * @param underlyingToken_ The token represented by the asset
     */
    function initialize(address underlyingToken_) public initializer {
        require(underlyingToken_ != address(0), 'Wombat: Token address cannot be zero');

        underlyingToken = underlyingToken_;
    }

    /**
     * TODO: move pool address setup within contract initialization
     * @notice Changes the pool. Can only be set by the contract owner.
     * @param pool_ new pool's address
     */
    function setPool(address pool_) external override onlyOwner {
        require(pool_ != address(0), 'Wombat: Pool address cannot be zero');
        emit PoolUpdated(pool, pool_);
        pool = pool_;
    }

    /**
     * @notice Changes asset max supply. Can only be set by the contract owner. 18 decimals
     * @param maxSupply_ the new asset's max supply
     */
    function setMaxSupply(uint256 maxSupply_) external onlyOwner {
        emit MaxSupplyUpdated(maxSupply, maxSupply_);
        maxSupply = maxSupply_;
    }

    /**
     * @notice Returns the decimals of Asset, fixed to 18 decimals
     * @return decimals for asset
     */
    function decimals() public view virtual override(ERC20, IAsset) returns (uint8) {
        return 18;
    }

    /**
     * @notice Returns the decimals of ERC20 underlyingToken
     * @return The current decimals for underlying token
     */
    function underlyingTokenDecimals() public view virtual override returns (uint8) {
        return ERC20(underlyingToken).decimals();
    }

    /**
     * @notice Get underlying Token Balance
     * @return Returns the actual balance of ERC20 underlyingToken
     */
    function underlyingTokenBalance() external view override returns (uint256) {
        return IERC20(underlyingToken).balanceOf(address(this));
    }

    /**
     * @notice Transfers ERC20 underlyingToken from this contract to another account. Can only be called by Pool.
     * @dev Not to be confused with transferring Wombat Assets.
     * @param to address to transfer the token to
     * @param amount amount to transfer
     */
    function transferUnderlyingToken(address to, uint256 amount) external override onlyPool {
        IERC20(underlyingToken).safeTransfer(to, amount);
    }

    /**
     * @notice Mint ERC20 Asset LP Token, expect pool coordinates other state updates. Can only be called by Pool.
     * @param to address to transfer the token to
     * @param amount amount to transfer
     */
    function mint(address to, uint256 amount) external override onlyPool {
        if (maxSupply != 0) {
            // if maxSupply == 0, asset is uncapped.
            require(amount + this.totalSupply() <= maxSupply, 'Wombat: MAX_SUPPLY_REACHED');
        }
        return _mint(to, amount);
    }

    /**
     * @notice Burn ERC20 Asset LP Token, expect pool coordinates other state updates. Can only be called by Pool.
     * @param to address holding the tokens
     * @param amount amount to burn
     */
    function burn(address to, uint256 amount) external override onlyPool {
        return _burn(to, amount);
    }

    /**
     * @notice Adds cash, expects actual ERC20 underlyingToken got transferred in. Can only be called by Pool.
     * @param amount amount to add
     */
    function addCash(uint256 amount) external override onlyPool {
        cash += amount;
    }

    /**
     * @notice Deducts cash, expect actual ERC20 got transferred out (by transferUnderlyingToken()).
     * Can only be called by Pool.
     * @param amount amount to remove
     */
    function removeCash(uint256 amount) external override onlyPool {
        require(cash >= amount, 'Wombat: INSUFFICIENT_CASH');
        cash -= amount;
    }

    /**
     * @notice Adds deposit or dividend, expect LP underlyingToken minted in case of deposit.
     * Can only be called by Pool.
     * @param amount amount to add
     */
    function addLiability(uint256 amount) external override onlyPool {
        liability += amount;
    }

    /**
     * @notice Removes deposit and dividend earned, expect LP underlyingToken burnt.
     * Can only be called by Pool.
     * @param amount amount to remove
     */
    function removeLiability(uint256 amount) external override onlyPool {
        require(liability >= amount, 'Wombat: INSUFFICIENT_LIABILITY');
        liability -= amount;
    }
}
