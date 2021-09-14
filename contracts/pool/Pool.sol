// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.5;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

import '../libraries/DSMath.sol';
import '../interfaces/IPriceOracleGetter.sol';
import '../interfaces/IWETH.sol';
import './WETHForwarder.sol';
import '../asset/Asset.sol';
import './Core.sol';

/**
 * @title Pool
 * @notice Manages deposits, withdrawals and swaps. Holds a mapping of assets and parameters.
 * @dev The main entry-point of Wombat protocol
 */
contract Pool is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable, Core {
    using DSMath for uint256;
    using SafeERC20 for IERC20;

    /// @notice Wei in 1 ether
    uint256 private constant ETH_UNIT = 10**18;

    /// @notice Slippage parameters K, N, C1 and xThreshold
    uint256 private _slippageParamK = 5 * 10**13; // (1/20_000) * WAD
    uint256 private _slippageParamN = 6; // 6
    uint256 private _c1 = 366166321751524166; // ((k**(1/(n+1))) / (n**((n)/(n+1)))) + (k*n)**(1/(n+1)) ~ 0.36...
    uint256 private _xThreshold = 313856847215592143; // (k*n)**(1/(n+1)) ~ 0.313...

    /// @notice Haircut rate
    uint256 private _haircutRate = 4 * 10**15; // 0.004 for intra-aggregate account swap

    /// @notice Retention ratio
    uint256 private _retentionRatio = ETH_UNIT; // 1

    /// @notice Dev address
    address private _dev;

    /// @notice Weth address
    address private _weth;

    /// @notice WETH Forwarder used to wrap and unwrap eth
    WETHForwarder private _wethForwarder;

    /// @notice The price oracle interface used in swaps
    IPriceOracleGetter private _priceOracle;

    /// @notice A record of assets inside Pool
    mapping(address => Asset) private _assets;

    /// @notice An event thats emitted when an asset is added to Pool
    event AssetAdded(address indexed token, address indexed asset);

    /// @notice An event thats emitted when a deposit is made to Pool
    event Deposit(address indexed sender, address token, uint256 amount, uint256 liquidity, address indexed to);

    /// @notice An event thats emitted when a withdrawal is made from Pool
    event Withdraw(address indexed sender, address token, uint256 amount, uint256 liquidity, address indexed to);

    /// @notice An event thats emitted when a swap is made in Pool
    event Swap(
        address indexed sender,
        address fromToken,
        address toToken,
        uint256 fromAmount,
        uint256 toAmount,
        address indexed to
    );

    /// @dev Modifier ensuring that certain function can only be called by developer
    modifier onlyDev() {
        require(_dev == msg.sender, 'Wombat: FORBIDDEN');
        _;
    }

    /// @dev Modifier ensuring a certain deadline for a function to complete execution
    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, 'Wombat: EXPIRED');
        _;
    }

    /**
     * @notice Initializes pool. Dev is set to be the account calling this function.
     * @param weth_ The weth address used to wrap eth (or BSC in our case) tokens by Pool.
     */
    function initialize(address weth_) external initializer {
        require(weth_ != address(0), 'Wombat: WETH address cannot be zero');

        __Ownable_init();
        __ReentrancyGuard_init_unchained();
        __Pausable_init_unchained();

        _dev = msg.sender;
        _weth = weth_;
    }

    // Getters //

    /**
     * @notice Gets current WETH address
     * @return The current WETH address for Pool
     */
    function getWETH() external view returns (address) {
        return _weth;
    }

    /**
     * @notice Gets current WETHForwarder address
     * @return The current WETHForwarder address for Pool
     */
    function getWETHForwarder() external view returns (address) {
        return address(_wethForwarder);
    }

    /**
     * @notice Gets current Dev address
     * @return The current Dev address for Pool
     */
    function getDev() external view returns (address) {
        return _dev;
    }

    /**
     * @notice Gets current Price Oracle address
     * @return The current Price Oracle address for Pool
     */
    function getPriceOracle() external view returns (address) {
        return address(_priceOracle);
    }

    /**
     * @notice Gets current C1 slippage parameter
     * @return The current C1 slippage parameter in Pool
     */
    function getC1() external view onlyOwner returns (uint256) {
        return _c1;
    }

    /**
     * @notice Gets current XThreshold slippage parameter
     * @return The current XThreshold slippage parameter in Pool
     */
    function getXThreshold() external view onlyOwner returns (uint256) {
        return _xThreshold;
    }

    /**
     * @notice Gets current K slippage parameter
     * @return The current K slippage parameter in Pool
     */
    function getSlippageParamK() external view onlyOwner returns (uint256) {
        return _slippageParamK;
    }

    /**
     * @notice Gets current N slippage parameter
     * @return The current N slippage parameter in Pool
     */
    function getSlippageParamN() external view onlyOwner returns (uint256) {
        return _slippageParamN;
    }

    /**
     * @notice Gets current Haircut parameter
     * @return The current Haircut parameter in Pool
     */
    function getHaircutRate() external view onlyOwner returns (uint256) {
        return _haircutRate;
    }

    /**
     * @notice Gets current retention ratio parameter
     * @return The current retention ratio parameter in Pool
     */
    function getRetentionRatio() external view onlyOwner returns (uint256) {
        return _retentionRatio;
    }

    /**
     * @dev pause pool, restricting certain operations
     */
    function pause() external onlyDev nonReentrant {
        _pause();
    }

    /**
     * @dev unpause pool, enabling certain operations
     */
    function unpause() external onlyDev nonReentrant {
        _unpause();
    }

    // Setters //
    /**
     * @notice Changes the contract dev. Can only be set by the contract owner.
     * @param dev new contract dev address
     */
    function setDev(address dev) external onlyOwner {
        require(dev != address(0), 'Wombat: address cannot be zero');
        _dev = dev;
    }

    /**
     * @notice Changes the pools WETH. Can only be set by the contract owner.
     * @param weth_ new pool's WETH address
     */
    function setWETH(address weth_) external onlyOwner {
        require(weth_ != address(0), 'Wombat: WETH address cannot be zero');
        _weth = weth_;
    }

    /**
     * @notice Changes the pools WETHForwarder. Can only be set by the contract owner.
     * @param wethForwarder new pool's WETHForwarder address
     */
    function setWETHForwarder(address payable wethForwarder) external onlyOwner nonReentrant {
        _wethForwarder = WETHForwarder(wethForwarder);
    }

    /**
     * @notice Changes the pools slippage param K. Can only be set by the contract owner.
     * @param k_ new pool's slippage param K
     */
    function setSlippageParamK(uint256 k_) external onlyOwner {
        require(k_ <= ETH_UNIT); // k should not be set bigger than 1
        _slippageParamK = k_;
    }

    /**
     * @notice Changes the pools slippage param N. Can only be set by the contract owner.
     * @param n_ new pool's slippage param N
     */
    function setSlippageParamN(uint256 n_) external onlyOwner {
        _slippageParamN = n_;
    }

    /**
     * @notice Changes the pools slippage param C1. Can only be set by the contract owner.
     * @param c1_ new pool's slippage param C1
     */
    function setC1(uint256 c1_) external onlyOwner {
        _c1 = c1_;
    }

    /**
     * @notice Changes the pools slippage param xThreshold. Can only be set by the contract owner.
     * @param xThreshold_ new pool's slippage param xThreshold
     */
    function setXThreshold(uint256 xThreshold_) external onlyOwner {
        _xThreshold = xThreshold_;
    }

    /**
     * @notice Changes the pools haircutRate. Can only be set by the contract owner.
     * @param haircutRate_ new pool's haircutRate_
     */
    function setHaircutRate(uint256 haircutRate_) external onlyOwner {
        require(haircutRate_ <= ETH_UNIT); // haircutRate_ should not be set bigger than 1
        _haircutRate = haircutRate_;
    }

    /**
     * @notice Changes the pools retentionRatio. Can only be set by the contract owner.
     * @param retentionRatio_ new pool's retentionRatio
     */
    function setRetentionRatio(uint256 retentionRatio_) external onlyOwner {
        require(retentionRatio_ <= ETH_UNIT); // retentionRatio_ should not be set bigger than 1
        _retentionRatio = retentionRatio_;
    }

    /**
     * @notice Changes the pools priceOracle. Can only be set by the contract owner.
     * @param priceOracle new pool's priceOracle addres
     */
    function setPriceOracle(address priceOracle) external onlyOwner nonReentrant {
        _priceOracle = IPriceOracleGetter(priceOracle);
    }

    /**
     * @notice Adds asset to pool, reverts if asset already exists in pool
     * @param token The address of token
     * @param asset The address of the Wombat Asset contract
     */
    function addAsset(address token, address asset) external onlyOwner nonReentrant {
        require(token != address(0), 'Wombat: ZERO_ADDRESS');
        require(asset != address(0), 'Wombat: ZERO_ADDRESS');
        require(address(_assets[token]) == address(0), 'Wombat: ASSET_EXISTS');

        _assets[token] = Asset(asset);

        emit AssetAdded(token, asset);
    }

    /**
     * @notice Gets Asset corresponding to ERC20 token. Reverts if asset does not exists in Pool.
     * @param token The address of ERC20 token
     */
    function _assetOf(address token) private view returns (Asset) {
        require(address(_assets[token]) != address(0), 'Wombat: ASSET_NOT_EXIST');
        return _assets[token];
    }

    /**
     * @notice Gets Asset corresponding to ERC20 token. Reverts if asset does not exists in Pool.
     * @dev to be used externally
     * @param token The address of ERC20 token
     */
    function assetOf(address token) external view returns (address) {
        return address(_assetOf(token));
    }

    /**
     * @notice Deposits asset in Pool
     * @param asset The asset to be deposited
     * @param amount The amount to be deposited
     * @param to The user accountable for deposit, receiving the Wombat assets (lp)
     * @return liquidity Total asset liquidity minted
     */
    function _deposit(
        Asset asset,
        uint256 amount,
        address to
    ) internal returns (uint256 liquidity) {
        require(to != address(0), 'Wombat: To user address cannot be zero');

        uint256 totalSupply = asset.totalSupply();
        uint256 liability = asset.liability();

        uint256 fee = _depositFee(
            _slippageParamK,
            _slippageParamN,
            _c1,
            _xThreshold,
            asset.cash(),
            asset.liability(),
            amount
        );

        // Calculate amount of LP to mint : ( deposit - fee ) * TotalAssetSupply / Liability
        liquidity = (liability == 0 ? (amount - fee) : ((amount - fee) * totalSupply) / liability);
        require(liquidity > 0, 'Wombat: INSUFFICIENT_LIQUIDITY_MINTED');

        asset.addCash(amount);
        asset.addLiability(amount - fee);
        asset.mint(to, liquidity);
    }

    /**
     * @notice Deposits amount of tokens into pool ensuring deadline
     * @dev Asset needs to be created and added to pool before any operation
     * @param token The token address to be deposited
     * @param amount The amount to be deposited
     * @param to The user accountable for deposit, receiving the Wombat assets (lp)
     * @param deadline The deadline to be respected
     * @return liquidity Total asset liquidity minted
     */
    function deposit(
        address token,
        uint256 amount,
        address to,
        uint256 deadline
    ) external ensure(deadline) nonReentrant whenNotPaused returns (uint256 liquidity) {
        require(amount > 0, 'Wombat: ZERO_AMOUNT');
        require(token != address(0), 'Wombat: ZERO_ADDRESS');
        require(to != address(0), 'Wombat: ZERO_ADDRESS');

        IERC20 erc20 = IERC20(token);
        Asset asset = _assetOf(token);

        erc20.safeTransferFrom(address(msg.sender), address(asset), amount);
        liquidity = _deposit(asset, amount, to);

        emit Deposit(msg.sender, token, amount, liquidity, to);
    }

    /**
     * @notice Calculates fee and liability to burn in case of withdrawal
     * @param asset The asset willing to be withdrawn
     * @param liquidity The liquidity willing to be withdrawn
     * @return amount Total amount to be withdrawn from Pool
     * @return liabilityToBurn Total liability to be burned by Pool
     * @return fee The fee of the withdraw operation
     */
    function _withdrawFrom(Asset asset, uint256 liquidity)
        private
        view
        returns (
            uint256 amount,
            uint256 liabilityToBurn,
            uint256 fee
        )
    {
        liabilityToBurn = (asset.liability() * liquidity) / asset.totalSupply();
        require(liabilityToBurn > 0, 'Wombat: INSUFFICIENT_LIQUIDITY_BURNED');

        fee = _withdrawalFee(
            _slippageParamK,
            _slippageParamN,
            _c1,
            _xThreshold,
            asset.cash(),
            asset.liability(),
            liabilityToBurn
        );

        // Prevent underflow in case withdrawal fees >= liabilityToBurn, user would only burn his underlying liability
        if (liabilityToBurn > fee) {
            if (asset.cash() < (liabilityToBurn - fee)) {
                amount = asset.cash(); // When asset does not contain enough cash, just withdraw the remaining cash
                fee = 0;
            } else {
                amount = liabilityToBurn - fee; // There is enough cash, standard withdrawal
            }
        } else {
            amount = 0;
        }
    }

    /**
     * @notice Withdraws liquidity amount of asset to `to` address ensuring minimum amount required
     * @param asset The asset to be withdrawn
     * @param liquidity The liquidity to be withdrawn
     * @param minimumAmount The minimum amount that will be accepted by user
     * @param to The user receiving the withdrawal
     * @return amount The total amount withdrawn
     */
    function _withdraw(
        Asset asset,
        uint256 liquidity,
        uint256 minimumAmount,
        address to
    ) private returns (uint256 amount) {
        // request lp token from user
        IERC20(asset).safeTransferFrom(address(msg.sender), address(asset), liquidity);

        // calculate liabilityToBurn and Fee
        uint256 liabilityToBurn;
        (amount, liabilityToBurn, ) = _withdrawFrom(asset, liquidity);

        require(minimumAmount <= amount, 'Wombat: AMOUNT_TOO_LOW');

        asset.burn(address(asset), liquidity);
        asset.removeCash(amount);
        asset.removeLiability(liabilityToBurn);
        asset.transferUnderlyingToken(to, amount);
    }

    /**
     * @notice Withdraws liquidity amount of asset to `to` address ensuring minimum amount required
     * @param token The token to be withdrawn
     * @param liquidity The liquidity to be withdrawn
     * @param minimumAmount The minimum amount that will be accepted by user
     * @param to The user receiving the withdrawal
     * @param deadline The deadline to be respected
     * @return amount The total amount withdrawn
     */
    function withdraw(
        address token,
        uint256 liquidity,
        uint256 minimumAmount,
        address to,
        uint256 deadline
    ) external ensure(deadline) nonReentrant whenNotPaused returns (uint256 amount) {
        require(liquidity > 0, 'Wombat: ZERO_ASSET_AMOUNT');
        require(token != address(0), 'Wombat: ZERO_ADDRESS');
        require(to != address(0), 'Wombat: ZERO_ADDRESS');

        Asset asset = _assetOf(token);

        amount = _withdraw(asset, liquidity, minimumAmount, to);

        emit Withdraw(msg.sender, token, amount, liquidity, to);
    }

    /**
     * @notice Swap fromToken for toToken, ensures deadline and minimumToAmount and sends quoted amount to `to` address
     * @param fromToken The token being inserted into Pool by user for swap
     * @param toToken The token wanted by user, leaving the Pool
     * @param fromAmount The amount of from token inserted
     * @param minimumToAmount The minimum amount that will be accepted by user as result
     * @param to The user receiving the result of swap
     * @param deadline The deadline to be respected
     */
    function swap(
        address fromToken,
        address toToken,
        uint256 fromAmount,
        uint256 minimumToAmount,
        address to,
        uint256 deadline
    ) external ensure(deadline) nonReentrant whenNotPaused {
        require(fromToken != address(0), 'Wombat: ZERO_ADDRESS');
        require(toToken != address(0), 'Wombat: ZERO_ADDRESS');
        require(fromToken != toToken, 'Wombat: SAME_ADDRESS');
        require(fromAmount > 0, 'Wombat: ZERO_FROM_AMOUNT');
        require(to != address(0), 'Wombat: ZERO_ADDRESS');

        IERC20 fromERC20 = IERC20(fromToken);
        Asset fromAsset = _assetOf(fromToken);
        Asset toAsset = _assetOf(toToken);

        // Intrapool swapping only
        require(toAsset.aggregateAccount() == fromAsset.aggregateAccount(), 'Wombat: INTERPOOL_SWAP_NOT_SUPPORTED');

        (uint256 actualToAmount, uint256 haircut) = _quoteFrom(fromAsset, toAsset, fromAmount);
        require(minimumToAmount <= actualToAmount, 'Wombat: AMOUNT_TOO_LOW');

        fromERC20.safeTransferFrom(address(msg.sender), address(fromAsset), fromAmount);
        fromAsset.addCash(fromAmount);
        toAsset.removeCash(actualToAmount);
        toAsset.addLiability(_dividend(haircut, _retentionRatio));
        toAsset.transferUnderlyingToken(to, actualToAmount);

        emit Swap(msg.sender, fromToken, toToken, fromAmount, actualToAmount, to);
    }

    /**
     * @notice Quotes the actual amount user would receive in a swap, taking in account slippage and haircut
     * @param fromAsset The initial asset
     * @param toAsset The asset wanted by user
     * @param fromAmount The amount to quote
     * @return actualToAmount The actual amount user would receive
     * @return haircut The haircut that will be applied
     */
    function _quoteFrom(
        Asset fromAsset,
        Asset toAsset,
        uint256 fromAmount
    ) private view returns (uint256 actualToAmount, uint256 haircut) {
        uint256 idealToAmount = _quoteIdealToAmount(fromAsset, toAsset, fromAmount);
        require(toAsset.cash() >= idealToAmount, 'Wombat: INSUFFICIENT_CASH');

        uint256 slippageFrom = _slippage(
            _slippageParamK,
            _slippageParamN,
            _c1,
            _xThreshold,
            fromAsset.cash(),
            fromAsset.liability(),
            fromAmount,
            true
        );
        uint256 slippageTo = _slippage(
            _slippageParamK,
            _slippageParamN,
            _c1,
            _xThreshold,
            toAsset.cash(),
            toAsset.liability(),
            idealToAmount,
            false
        );
        uint256 swappingSlippage = _swappingSlippage(slippageFrom, slippageTo);
        uint256 toAmount = idealToAmount.wmul(swappingSlippage);
        haircut = _haircut(toAmount, _haircutRate);
        actualToAmount = toAmount - haircut;
    }

    /**
     * @notice Quotes the ideal amount in case of swap
     * @dev Does not take into account slippage parameters nor haircut
     * @param fromAsset The initial asset
     * @param toAsset The asset wanted by user
     * @param fromAmount The amount to quote
     * @return idealToAmount The ideal amount user would receive
     */
    function _quoteIdealToAmount(
        Asset fromAsset,
        Asset toAsset,
        uint256 fromAmount
    ) private view returns (uint256 idealToAmount) {
        idealToAmount = (((fromAmount * _priceOracle.getAssetPrice(fromAsset.underlyingToken())).wmul(
            _priceOracle.getETHPriceInAsset(toAsset.underlyingToken())
        ) * 10**toAsset.decimals()) /
            10**fromAsset.decimals() /
            ETH_UNIT);
    }

    /**
     * @notice Quotes potential outcome of a swap given current state, taking in account slippage and haircut
     * @dev To be used by frontend
     * @param fromToken The initial ERC20 token
     * @param toToken The token wanted by user
     * @param fromAmount The amount to quote
     * @return potentialOutcome The potential amount user would receive
     * @return haircut The haircut that would be applied
     */
    function quotePotentialSwap(
        address fromToken,
        address toToken,
        uint256 fromAmount
    ) external view whenNotPaused returns (uint256 potentialOutcome, uint256 haircut) {
        require(fromToken != address(0), 'Wombat: ZERO_ADDRESS');
        require(toToken != address(0), 'Wombat: ZERO_ADDRESS');
        require(fromToken != toToken, 'Wombat: SAME_ADDRESS');
        require(fromAmount > 0, 'Wombat: ZERO_FROM_AMOUNT');

        Asset fromAsset = _assetOf(fromToken);
        Asset toAsset = _assetOf(toToken);

        // Intrapool swapping only
        require(toAsset.aggregateAccount() == fromAsset.aggregateAccount(), 'Wombat: INTERPOOL_SWAP_NOT_SUPPORTED');

        (potentialOutcome, haircut) = _quoteFrom(fromAsset, toAsset, fromAmount);
    }

    /**
     * @notice Quotes potential withdrawal from pool
     * @dev To be used by frontend
     * @param token The token to be withdrawn by user
     * @param liquidity The liquidity (amount of lp assets) to be withdrawn
     * @return amount The potential amount user would receive
     * @return fee The fee that would be applied
     * @return enoughCash does the pool have enough cash? (cash >= liabilityToBurn - fee)
     */
    function quotePotentialWithdraw(address token, uint256 liquidity)
        external
        view
        whenNotPaused
        returns (
            uint256 amount,
            uint256 fee,
            bool enoughCash
        )
    {
        require(token != address(0), 'Wombat: ZERO_ADDRESS');
        require(liquidity > 0, 'Wombat: liquidity must be greater than zero');

        Asset asset = _assetOf(token);
        uint256 liabilityToBurn;
        (amount, liabilityToBurn, fee) = _withdrawFrom(asset, liquidity);
        if (amount < liabilityToBurn - fee) {
            enoughCash = false;
        } else {
            enoughCash = true;
        }
    }
}
