// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.5;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

import '../asset/Asset.sol';
import './CoreV2.sol';
import './PausableAssets.sol';

/**
 * @title Pool
 * @notice Manages deposits, withdrawals and swaps. Holds a mapping of assets and parameters.
 * @dev The main entry-point of Wombat protocol
 */
contract Pool is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    PausableAssets,
    CoreV2
{
    using SafeERC20 for IERC20;
    using SignedSafeMath for int256;

    /// @notice Wei in 1 ether
    uint256 private constant ETH_UNIT = 10**18;

    /// @notice Amplification factor
    uint256 private _ampFactor = 5 * 10**16; // 0.05 for amplification factor

    /// @notice Haircut rate
    uint256 private _haircutRate = 4 * 10**14; // 0.0004, i.e. 0.04% for intra-aggregate account stableswap

    /// @notice Retention ratio
    uint256 private _retentionRatio = ETH_UNIT; // 1

    /// @notice Dev address
    address private _dev;

    /// @notice Asset Map struct holds assets
    struct AssetMap {
        address[] keys;
        mapping(address => Asset) values;
        mapping(address => uint256) indexOf;
    }

    /// @notice A record of assets inside Pool
    AssetMap private _assets;

    address public feeTo;

    /// @notice Dividend collected by each asset (unit: underlying token)
    mapping(Asset => uint256) private _feeCollected;

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
     */
    function initialize() external initializer {
        __Ownable_init();
        __ReentrancyGuard_init_unchained();
        __Pausable_init_unchained();

        _dev = msg.sender;
    }

    // Getters //

    /**
     * @notice Gets current Dev address
     * @return The current Dev address for Pool
     */
    function getDev() external view returns (address) {
        return _dev;
    }

    /**
     * @notice Gets current amplification factor parameter
     * @return The current amplification factor parameter in Pool
     */
    function getAmpFactor() external view onlyOwner returns (uint256) {
        return _ampFactor;
    }

    /**
     * @notice Gets current haircut parameter
     * @return The current haircut parameter in Pool
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

    /**
     * @dev pause asset, restricting deposit and swap operations
     */
    function pauseAsset(address asset) external onlyDev nonReentrant {
        _pauseAsset(asset);
    }

    /**
     * @dev unpause asset, enabling deposit and swap operations
     */
    function unpauseAsset(address asset) external onlyDev nonReentrant {
        _unpauseAsset(asset);
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
     * @notice Changes the pools amplification factor. Can only be set by the contract owner.
     * @param ampFactor_ new pool's amplification factor
     */
    function setAmpFactor(uint256 ampFactor_) external onlyOwner {
        require(ampFactor_ <= ETH_UNIT, 'Wombat: ampFactor should be <= 1'); // ampFactor_ should not be set bigger than 1
        _ampFactor = ampFactor_;
    }

    /**
     * @notice Changes the pools haircutRate. Can only be set by the contract owner.
     * @param haircutRate_ new pool's haircutRate_
     */
    function setHaircutRate(uint256 haircutRate_) external onlyOwner {
        require(haircutRate_ <= ETH_UNIT, 'Wombat: haircutRate should be <= 1'); // haircutRate_ should not be set bigger than 1
        _haircutRate = haircutRate_;
    }

    /**
     * @notice Changes the pools retentionRatio. Can only be set by the contract owner.
     * @param retentionRatio_ new pool's retentionRatio
     */
    function setRetentionRatio(uint256 retentionRatio_) external onlyOwner {
        require(retentionRatio_ <= ETH_UNIT, 'Wombat: retentionRatio should be <= 1'); // retentionRatio_ should not be set bigger than 1
        _retentionRatio = retentionRatio_;
    }

    /**
     * @notice Changes the fee beneficiary. Can only be set by the contract owner.
     * This value cannot be set to 0 to avoid unsettled fee.
     * @param feeTo_ new fee beneficiary
     */
    function setFeeTo(address feeTo_) external onlyOwner {
        require(feeTo_ != address(0), 'Wombat: set retention ratio instead');
        feeTo = feeTo_;
    }

    /**
     * @notice Adds asset to pool, reverts if asset already exists in pool
     * @param token The address of token
     * @param asset The address of the Wombat Asset contract
     */
    function addAsset(address token, address asset) external onlyOwner nonReentrant {
        require(token != address(0), 'Wombat: ZERO_ADDRESS');
        _addAsset(token, asset);
    }

    /**
     * @notice Adds asset to pool, reverts if asset already exists in pool
     * @param token The address of token
     * @param asset The address of the Wombat Asset contract
     */
    function _addAsset(address token, address asset) private {
        require(asset != address(0), 'Wombat: ZERO_ADDRESS');
        require(!_containsAsset(token), 'Wombat: ASSET_EXISTS');

        _assets.values[token] = Asset(asset);
        _assets.indexOf[token] = _assets.keys.length;
        _assets.keys.push(token);

        emit AssetAdded(token, asset);
    }

    /**
     * @notice get length of asset list
     * @return the size of the asset list
     */
    function _sizeOfAssetList() private view returns (uint256) {
        return _assets.keys.length;
    }

    /**
     * @notice Gets asset with token address key
     * @param key The address of token
     * @return the corresponding asset in state
     */
    function _getAsset(address key) private view returns (Asset) {
        return _assets.values[key];
    }

    /**
     * @notice Gets key (address) at index
     * @param index the index
     * @return the key of index
     */
    function _getKeyAtIndex(uint256 index) private view returns (address) {
        return _assets.keys[index];
    }

    /**
     * @notice Looks if the asset is contained by the list
     * @param token The address of token to look for
     * @return bool true if the asset is in asset list, false otherwise
     */
    function _containsAsset(address token) private view returns (bool) {
        return _assets.values[token] != Asset(address(0));
    }

    /**
     * @notice Gets Asset corresponding to ERC20 token. Reverts if asset does not exists in Pool.
     * @param token The address of ERC20 token
     */
    function _assetOf(address token) private view returns (Asset) {
        require(_containsAsset(token), 'Wombat: ASSET_NOT_EXIST');
        return _assets.values[token];
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

        // collect fee before deposit
        _mintFee(asset);

        uint256 totalSupply = asset.totalSupply();
        uint256 liability = asset.liability();
        uint256 reward = _depositReward(amount, asset);

        // Calculate amount of LP to mint : ( deposit + reward ) * TotalAssetSupply / Liability
        liquidity = (liability == 0 ? (amount + reward) : ((amount + reward) * totalSupply) / liability);
        require(liquidity > 0, 'Wombat: INSUFFICIENT_LIQUIDITY_MINTED');

        asset.addCash(amount);
        asset.addLiability(amount + reward);
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
        requireAssetNotPaused(token);

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
     * @return fee
     * @return enoughCash
     */
    function _withdrawFrom(Asset asset, uint256 liquidity)
        private
        view
        returns (
            uint256 amount,
            uint256 liabilityToBurn,
            uint256 fee,
            bool enoughCash
        )
    {
        liabilityToBurn = (asset.liability() * liquidity) / asset.totalSupply();
        require(liabilityToBurn > 0, 'Wombat: INSUFFICIENT_LIQUIDITY_BURNED');

        uint256 fee = _withdrawFee(liabilityToBurn, asset);

        // Prevent underflow in case withdrawal fees >= liabilityToBurn, user would only burn his underlying liability
        if (liabilityToBurn > fee) {
            if (asset.cash() < (liabilityToBurn - fee)) {
                amount = asset.cash(); // When asset does not contain enough cash, just withdraw the remaining cash
                fee = 0;
                enoughCash = false;
            } else {
                amount = liabilityToBurn - fee; // There is enough cash, standard withdrawal
                enoughCash = true;
            }
        } else {
            fee = liabilityToBurn;
            amount = 0;
            enoughCash = false;
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
        // collect fee before withdraw
        _mintFee(asset);

        // request lp token from user
        IERC20(asset).safeTransferFrom(address(msg.sender), address(asset), liquidity);

        // calculate liabilityToBurn and Fee
        uint256 liabilityToBurn;
        (amount, liabilityToBurn, , ) = _withdrawFrom(asset, liquidity);

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
        requireAssetNotPaused(fromToken);

        IERC20 fromERC20 = IERC20(fromToken);
        Asset fromAsset = _assetOf(fromToken);
        Asset toAsset = _assetOf(toToken);

        // Intrapool swapping only
        require(toAsset.aggregateAccount() == fromAsset.aggregateAccount(), 'Wombat: INTERPOOL_SWAP_NOT_SUPPORTED');

        (uint256 actualToAmount, uint256 haircut) = _quoteFrom(fromAsset, toAsset, fromAmount);
        require(minimumToAmount <= actualToAmount, 'Wombat: AMOUNT_TOO_LOW');

        // should not collect any fee if feeTo is not set
        uint256 dividend = address(feeTo) != address(0) ? _dividend(haircut, _retentionRatio) : 0;
        _feeCollected[toAsset] += dividend;

        emit Swap(msg.sender, fromToken, toToken, fromAmount, actualToAmount, to);
        fromERC20.safeTransferFrom(address(msg.sender), address(fromAsset), fromAmount);
        fromAsset.addCash(fromAmount);
        toAsset.removeCash(actualToAmount);
        toAsset.transferUnderlyingToken(to, actualToAmount);
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
        uint8 dTo = toAsset.decimals();
        uint256 idealToAmount = _quoteIdealToAmount(fromAsset, toAsset, fromAmount);
        require(toAsset.cash() >= idealToAmount, 'Wombat: INSUFFICIENT_CASH');

        haircut = _haircut(idealToAmount, _haircutRate);
        actualToAmount = idealToAmount - haircut;
    }

    /**
     * @notice Quotes the ideal amount in case of swap
     * @dev Does not take into haircut or other fees
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
        uint8 dFrom = fromAsset.decimals();
        uint8 dTo = toAsset.decimals();

        uint256 Ax = _convertToWAD(dFrom, fromAsset.cash());
        uint256 Lx = _convertToWAD(dFrom, fromAsset.liability());
        uint256 Ay = _convertToWAD(dTo, toAsset.cash());
        uint256 Ly = _convertToWAD(dTo, toAsset.liability());
        uint256 fromAmountInWAD = _convertToWAD(dFrom, fromAmount);

        // in case div of 0
        require(Lx > 0, 'Not enough from-asset');

        uint256 idealToAmountInWAD = _swapQuoteFunc(Ax, Ay, Lx, Ly, fromAmountInWAD, _ampFactor);
        idealToAmount = _convertFromWAD(dTo, idealToAmountInWAD);
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
        (amount, , fee, enoughCash) = _withdrawFrom(asset, liquidity);
    }

    /**
     * @notice Private function to send fee collected to the fee beneficiary
     * @param asset The address of the asset to collect fee
     */
    function _mintFee(Asset asset) private {
        if (address(feeTo) != address(0)) {
            uint256 feeCollected = _feeCollected[asset];
            if (feeCollected > 0) {
                _feeCollected[asset] = 0;
                // call totalSupply() and liability() before mint()
                asset.mint(feeTo, (feeCollected * asset.totalSupply()) / asset.liability());
                asset.addLiability(feeCollected);
            }
        }
    }

    /**
     * @notice Send fee collected to the fee beneficiary
     * @param asset The address of the asset to collect fee
     */
    function mintFee(Asset asset) external {
        _mintFee(asset);
    }

    function _depositReward(uint256 amount, Asset asset) internal view returns (uint256 reward) {
        // overflow is unrealistic
        uint8 d = asset.decimals();
        int256 delta_i = int256(_convertToWAD(d, amount));
        int256 A_i = int256(_convertToWAD(d, asset.cash()));
        int256 L_i = int256(_convertToWAD(d, asset.liability()));
        int256 A = int256(_ampFactor);

        int256 D;
        int256 SL;
        (D, SL) = _globalInvariantFunc(A);

        int256 w = depositRewardImpl(SL, delta_i, A_i, L_i, D, A);

        // precision error
        if (w >= -1e6 && w <= 0) {
            return 0;
        }
        // security check
        require(w > 0, 'Wombat: reward < 0?');

        reward = _convertFromWAD(d, uint256(w));
        // console.log('reward', reward);
    }

    function _withdrawFee(uint256 amount, Asset asset) internal view returns (uint256 fee) {
        // overflow is unrealistic
        uint8 d = asset.decimals();
        int256 delta_i = -int256(_convertToWAD(d, amount));
        int256 A_i = int256(_convertToWAD(d, asset.cash()));
        int256 L_i = int256(_convertToWAD(d, asset.liability()));
        int256 A = int256(_ampFactor);

        int256 D;
        int256 SL;
        (D, SL) = _globalInvariantFunc(A);

        int256 w = depositRewardImpl(SL, delta_i, A_i, L_i, D, A);

        // precision error
        if (w >= 0 && w <= 1e6) {
            return 0;
        }
        // security check
        require(w < 0, 'Wombat: fee < 0?');

        fee = _convertFromWAD(d, uint256(-w));
        // console.log('fee', fee);
    }

    function globalEquilCovRatio() external view returns (uint256 er) {
        int256 A = int256(_ampFactor);

        int256 D;
        int256 SL;
        (D, SL) = _globalInvariantFunc(A);

        er = uint256(_equilCovRatio(D, SL, A));
    }

    function _globalInvariantFunc(int256 A) internal view returns (int256 D, int256 SL) {
        for (uint256 i = 0; i < _sizeOfAssetList(); i++) {
            Asset asset = _getAsset(_getKeyAtIndex(i));

            // overflow is unrealistic
            uint8 d = asset.decimals();
            int256 A_i = int256(_convertToWAD(d, asset.cash()));
            int256 L_i = int256(_convertToWAD(d, asset.liability()));

            if (L_i == 0) {
                // avoid division of 0
                continue;
            }

            int256 r_i = A_i.wdiv(L_i);
            SL += L_i;
            D += L_i.wmul(r_i - A.wmul(L_i).wdiv(A_i));
        }
    }
}
