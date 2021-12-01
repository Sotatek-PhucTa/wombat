// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.5;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import 'hardhat/console.sol';

/**
 * @title Asset
 * @notice Contract presenting an asset in a pool
 * @dev Expect to be owned by Timelock for management, and _pool links to Pool for coordination
 */
contract Asset is Ownable, Initializable, ERC20 {
    using SafeERC20 for IERC20;

    /// @notice The underlying underlyingToken represented by this asset
    address private _underlyingToken;
    /// @notice The Pool
    address private _pool;
    /// @notice Cash balance, normally it should align with IERC20(_underlyingToken).balanceOf(address(this))
    uint256 private _cash;
    /// @notice Total liability, equals to the sum of deposit and dividend
    uint256 private _liability;
    /// @notice Owner
    address private _owner;
    /// @notice Name of the asset
    string public _name;
    /// @notice Symbol of the asset
    string public _symbol;
    /// @notice Aggregate Account of the asset
    address private _aggregateAccount;

    /**
     * @notice Constructor.
     * @param underlyingToken_ The token represented by the asset
     * @param name_ The name of the asset
     * @param symbol_ The symbol of the asset
     * @param aggregateAccount_ The aggregate account to which the the asset belongs
     */
    constructor(
        address underlyingToken_,
        string memory name_,
        string memory symbol_,
        address aggregateAccount_
    ) ERC20(name_, symbol_) {
        initialize(underlyingToken_, name_, symbol_, aggregateAccount_);
    }

    /**
     * @notice Initializer.
     * @dev _ suffix to avoid shadowing underlyingToken() name and  symbol
     * @param underlyingToken_ The token represented by the asset
     * @param name_ The name of the asset
     * @param symbol_ The symbol of the asset
     * @param aggregateAccount_ The aggregate account to which the the asset belongs
     */
    function initialize(
        address underlyingToken_,
        string memory name_,
        string memory symbol_,
        address aggregateAccount_
    ) public initializer {
        require(underlyingToken_ != address(0), 'Wombat: Token address cannot be zero');
        require(aggregateAccount_ != address(0), 'Wombat: Aggregate account address cannot be zero');

        _owner = msg.sender;
        _name = name_;
        _symbol = symbol_;
        _underlyingToken = underlyingToken_;
        _aggregateAccount = aggregateAccount_;
    }

    /// @dev Modifier ensuring that certain function can only be called by pool
    modifier onlyPool() {
        require(msg.sender == _pool, 'Wombat: FORBIDDEN');
        _;
    }

    /**
     * @notice Gets current Pool address
     * @return The current Pool address for Asset
     */
    function pool() external view returns (address) {
        return _pool;
    }

    /**
     * TODO: move pool address setup within contract initialization
     * @notice Changes the pool. Can only be set by the contract owner.
     * @param pool_ new pool's address
     */
    function setPool(address pool_) external onlyOwner {
        // console.log("pool_ log:", pool_, address(0));
        require(pool_ != address(0), 'Wombat: Pool address cannot be zero');
        _pool = pool_;
    }

    /**
     * @notice Returns the address of the Aggregate Account 'holding' this asset
     * @return The current Aggregate Account address for Asset
     */
    function aggregateAccount() external view returns (address) {
        return _aggregateAccount;
    }

    /**
     * @notice Returns the address of ERC20 underlyingToken represented by this asset
     * @return The current address of ERC20 underlyingToken for Asset
     */
    function underlyingToken() external view returns (address) {
        return _underlyingToken;
    }

    /**
     * @notice Returns the decimals of ERC20 underlyingToken
     * @return The current decimals for underlying token
     */
    function decimals() public view virtual override returns (uint8) {
        // `decimals` not in IERC20
        return ERC20(_underlyingToken).decimals();
    }

    /**
     * @notice Get underlying Token Balance
     * @return Returns the actual balance of ERC20 underlyingToken
     */
    function underlyingTokenBalance() external view returns (uint256) {
        return IERC20(_underlyingToken).balanceOf(address(this));
    }

    /**
     * @notice Transfers ERC20 underlyingToken from this contract to another account. Can only be called by Pool.
     * @dev Not to be confused with transferring Wombat Assets.
     * @param to address to transfer the token to
     * @param amount amount to transfer
     */
    function transferUnderlyingToken(address to, uint256 amount) external onlyPool {
        IERC20(_underlyingToken).safeTransfer(to, amount);
    }

    /**
     * @notice Mint ERC20 Asset LP Token, expect pool coordinates other state updates. Can only be called by Pool.
     * @param to address to transfer the token to
     * @param amount amount to transfer
     */
    function mint(address to, uint256 amount) external onlyPool {
        return _mint(to, amount);
    }

    /**
     * @notice Burn ERC20 Asset LP Token, expect pool coordinates other state updates. Can only be called by Pool.
     * @param to address holding the tokens
     * @param amount amount to burn
     */
    function burn(address to, uint256 amount) external onlyPool {
        return _burn(to, amount);
    }

    /**
     * @notice Returns the amount of underlyingToken transferrable, expect to match underlyingTokenBalance()
     */
    function cash() external view returns (uint256) {
        return _cash;
    }

    /**
     * @notice Adds cash, expects actual ERC20 underlyingToken got transferred in. Can only be called by Pool.
     * @param amount amount to add
     */
    function addCash(uint256 amount) external onlyPool {
        _cash += amount;
    }

    /**
     * @notice Deducts cash, expect actual ERC20 got transferred out (by transferUnderlyingToken()).
     * Can only be called by Pool.
     * @param amount amount to remove
     */
    function removeCash(uint256 amount) external onlyPool {
        require(_cash >= amount, 'Wombat: INSUFFICIENT_CASH');
        _cash -= amount;
    }

    /**
     * @notice Returns the amount of liability, the total deposit and dividend
     */
    function liability() external view returns (uint256) {
        return _liability;
    }

    /**
     * @notice Adds deposit or dividend, expect LP underlyingToken minted in case of deposit.
     * Can only be called by Pool.
     * @param amount amount to add
     */
    function addLiability(uint256 amount) external onlyPool {
        _liability += amount;
    }

    /**
     * @notice Removes deposit and dividend earned, expect LP underlyingToken burnt.
     * Can only be called by Pool.
     * @param amount amount to remove
     */
    function removeLiability(uint256 amount) external onlyPool {
        require(_liability >= amount, 'Wombat: INSUFFICIENT_LIABILITY');
        _liability -= amount;
    }
}
