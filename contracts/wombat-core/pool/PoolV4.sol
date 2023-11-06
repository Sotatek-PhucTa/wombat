// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

import './CoreV4.sol';
import './PausableAssets.sol';
import '../../wombat-governance/interfaces/IMasterWombat.sol';
import '../libraries/AssetLibrary.sol';
import '../interfaces/IPoolV4.sol';

/**
 * @title Pool V4
 * @notice Manages deposits, withdrawals and swaps. Holds a mapping of assets and parameters.
 * @dev The main entry-point of Wombat protocol
 * Note: All variables are 18 decimals, except from that of underlying tokens
 * Change log:
 * - V2: Add `gap` to prevent storage collision for future upgrades
 * - V3:
 *   - *Breaking change*: interface change for quotePotentialDeposit, quotePotentialWithdraw
 *     and quotePotentialWithdrawFromOtherAsset, the reward/fee parameter is removed as it is
 *     ambiguous in the context of volatile pools.
 *   - Contract size compression
 *   - `mintFee` ignores `mintFeeThreshold`
 *   - `globalEquilCovRatio` returns int256 `instead` of `uint256`
 *   - Emit event `SwapV2` with `toTokenFee` instead of `Swap`
 * - TODOs for V4:
 *   - Consider renaming returned value `uint256 haircut` to `toTokenFee / haircutInToToken`
 * - V4:
 *   - Delegate pool logic to external contract
 */
contract PoolV4 is
    Initializable,
    IPoolV4,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    PausableAssets
{
    using AssetLibrary for AssetLibrary.AssetMap;
    using DSMath for uint256;
    using SafeERC20 for IERC20;
    using SignedSafeMath for int256;
    using SignedSafeMath for uint256;

    int256 internal constant WAD_I = 10 ** 18;
    uint256 internal constant WAD = 10 ** 18;

    /* Storage */

    PoolV4Data poolData;

    /* Events */

    /// @notice An event thats emitted when a deposit is made to Pool
    event Deposit(address indexed sender, IERC20 token, uint256 amount, uint256 liquidity, address indexed to);

    /// @notice An event thats emitted when a withdrawal is made from Pool
    event Withdraw(address indexed sender, IERC20 token, uint256 amount, uint256 liquidity, address indexed to);

    event SwapV2(
        address indexed sender,
        IERC20 fromToken,
        IERC20 toToken,
        uint256 fromAmount,
        uint256 toAmount,
        uint256 toTokenFee,
        address indexed to
    );

    event SetDev(address addr);
    event SetMasterWombat(address addr);
    event SetFeeTo(address addr);

    event AssetAdded(IERC20 indexed token, IAsset indexed asset);
    event AssetRemoved(IERC20 indexed token, IAsset indexed asset);

    event SetMintFeeThreshold(uint256 value);
    event SetFee(uint256 lpDividendRatio, uint256 retentionRatio);
    event SetAmpFactor(uint256 value);
    event SetHaircutRate(uint256 value);
    event SetWithdrawalHaircutRate(uint256 value);

    event FillPool(IERC20 token, uint256 amount);
    event TransferTipBucket(IERC20 token, uint256 amount, address to);

    /* Errors */

    error WOMBAT_FORBIDDEN();
    error WOMBAT_EXPIRED();

    error WOMBAT_ZERO_ADDRESS();
    error WOMBAT_ZERO_AMOUNT();
    error WOMBAT_ZERO_LIQUIDITY();
    error WOMBAT_INVALID_VALUE();
    error WOMBAT_SAME_ADDRESS();
    error WOMBAT_AMOUNT_TOO_LOW();

    /* Pesudo modifiers to save gas */

    function _checkLiquidity(uint256 liquidity) internal pure {
        if (liquidity == 0) revert WOMBAT_ZERO_LIQUIDITY();
    }

    function _checkAddress(address to) internal pure {
        if (to == address(0)) revert WOMBAT_ZERO_ADDRESS();
    }

    function _checkSameAddress(address from, address to) internal pure {
        if (from == to) revert WOMBAT_SAME_ADDRESS();
    }

    function _checkAmount(uint256 minAmt, uint256 amt) internal pure {
        if (minAmt > amt) revert WOMBAT_AMOUNT_TOO_LOW();
    }

    function _ensure(uint256 deadline) internal view {
        if (deadline < block.timestamp) revert WOMBAT_EXPIRED();
    }

    function _onlyDev() internal view {
        if (poolData.dev != msg.sender) revert WOMBAT_FORBIDDEN();
    }

    /* Construtor and setters */

    /**
     * @notice Initializes pool. dev is set to be the account calling this function.
     */
    function initialize(uint256 ampFactor_, uint256 haircutRate_) public virtual initializer {
        __Ownable_init();
        __ReentrancyGuard_init_unchained();
        __Pausable_init_unchained();

        if (ampFactor_ > WAD || haircutRate_ > WAD) revert WOMBAT_INVALID_VALUE();
        poolData.ampFactor = ampFactor_;
        poolData.haircutRate = haircutRate_;

        poolData.lpDividendRatio = WAD;

        poolData.dev = msg.sender;
    }

    /**
     * Permisioneed functions
     */

    /**
     * @notice Adds asset to pool, reverts if asset already exists in pool
     * @param token The address of token
     * @param asset The address of the Wombat Asset contract
     */
    function addAsset(IERC20 token, IAsset asset) external onlyOwner {
        _checkAddress(address(asset));
        _checkAddress(address(token));
        _checkSameAddress(address(token), address(asset));

        AssetLibrary.addAsset(poolData.assets, token, asset);

        emit AssetAdded(token, asset);
    }

    /**
     * @notice Removes asset from asset struct
     * @dev Can only be called by owner
     * @param token The address of token to remove
     */
    function removeAsset(IERC20 token) external onlyOwner {
        IAsset asset = poolData.assets.assetOf(token);

        AssetLibrary.removeAsset(poolData.assets, token);

        emit AssetRemoved(token, asset);
    }

    /**
     * @notice Changes the contract dev. Can only be set by the contract owner.
     * @param dev_ new contract dev address
     */
    function setDev(address dev_) external onlyOwner {
        _checkAddress(dev_);
        poolData.dev = dev_;
        emit SetDev(dev_);
    }

    function setMasterWombat(address masterWombat_) external onlyOwner {
        _checkAddress(masterWombat_);
        poolData.masterWombat = masterWombat_;
        emit SetMasterWombat(masterWombat_);
    }

    /**
     * @notice Changes the pools amplification factor. Can only be set by the contract owner.
     * @param ampFactor_ new pool's amplification factor
     */
    function setAmpFactor(uint256 ampFactor_) external onlyOwner {
        if (ampFactor_ > WAD) revert WOMBAT_INVALID_VALUE(); // ampFactor_ should not be set bigger than 1
        poolData.ampFactor = ampFactor_;
        emit SetAmpFactor(ampFactor_);
    }

    /**
     * @notice Changes the pools poolData.haircutRate. Can only be set by the contract owner.
     * @param haircutRate_ new pool's haircutRate_
     */
    function setHaircutRate(uint256 haircutRate_) external onlyOwner {
        if (haircutRate_ > WAD) revert WOMBAT_INVALID_VALUE(); // haircutRate_ should not be set bigger than 1
        poolData.haircutRate = haircutRate_;
        emit SetHaircutRate(haircutRate_);
    }

    function setWithdrawalHaircutRate(uint256 withdrawalHaircutRate_) external onlyOwner {
        if (withdrawalHaircutRate_ > WAD) revert WOMBAT_INVALID_VALUE();
        poolData.withdrawalHaircutRate = withdrawalHaircutRate_;
        emit SetWithdrawalHaircutRate(withdrawalHaircutRate_);
    }

    function setFee(uint256 lpDividendRatio_, uint256 retentionRatio_) external onlyOwner {
        if (retentionRatio_ + lpDividendRatio_ > WAD) revert WOMBAT_INVALID_VALUE();

        CoreV4.mintAllFees(poolData, _getGlobalEquilCovRatioForDepositWithdrawal());
        poolData.retentionRatio = retentionRatio_;
        poolData.lpDividendRatio = lpDividendRatio_;
        emit SetFee(lpDividendRatio_, retentionRatio_);
    }

    /**
     * @dev unit of amount should be in WAD
     */
    function transferTipBucket(IERC20 token, uint256 amount, address to) external onlyOwner {
        IAsset asset = poolData.assets.assetOf(token);
        uint256 tipBucketBal = tipBucketBalance(token);

        if (amount > tipBucketBal) {
            // revert if there's not enough amount in the tip bucket
            revert WOMBAT_INVALID_VALUE();
        }

        asset.transferUnderlyingToken(to, amount.fromWad(asset.underlyingTokenDecimals()));
        emit TransferTipBucket(token, amount, to);
    }

    /**
     * @notice Changes the fee beneficiary. Can only be set by the contract owner.
     * This value cannot be set to 0 to avoid unsettled fee.
     * @param feeTo_ new fee beneficiary
     */
    function setFeeTo(address feeTo_) external onlyOwner {
        _checkAddress(feeTo_);
        poolData.feeTo = feeTo_;
        emit SetFeeTo(feeTo_);
    }

    /**
     * @notice Set min fee to mint
     */
    function setMintFeeThreshold(uint256 mintFeeThreshold_) external onlyOwner {
        poolData.mintFeeThreshold = mintFeeThreshold_;
        emit SetMintFeeThreshold(mintFeeThreshold_);
    }

    /**
     * @dev pause pool, restricting certain operations
     */
    function pause() external {
        _onlyDev();
        _pause();
    }

    /**
     * @dev unpause pool, enabling certain operations
     */
    function unpause() external {
        _onlyDev();
        _unpause();
    }

    /**
     * @dev pause asset, restricting deposit and swap operations
     */
    function pauseAsset(IERC20 token) external {
        _onlyDev();
        poolData.assets.checkAssetExistFor(token);
        _pauseAsset(address(token));
    }

    /**
     * @dev unpause asset, enabling deposit and swap operations
     */
    function unpauseAsset(IERC20 token) external {
        _onlyDev();
        _unpauseAsset(address(token));
    }

    /**
     * @notice Move fund from tip bucket to the pool to keep r* = 1 as error accumulates
     * unit of amount should be in WAD
     */
    function fillPool(IERC20 token, uint256 amount) external {
        _onlyDev();
        IAsset asset = poolData.assets.assetOf(token);
        uint256 tipBucketBal = tipBucketBalance(token);

        if (amount > tipBucketBal) {
            // revert if there's not enough amount in the tip bucket
            revert WOMBAT_INVALID_VALUE();
        }

        asset.addCash(amount);
        emit FillPool(token, amount);
    }

    /* Assets */

    /**
     * @notice Return list of tokens in the pool
     */
    function getTokens() external view returns (IERC20[] memory) {
        return poolData.assets.keys;
    }

    /**
     * @notice Gets Asset corresponding to ERC20 token. Reverts if asset does not exists in Pool.
     * @dev to be used externally
     * @param token The address of ERC20 token
     */
    function addressOfAsset(IERC20 token) external view override returns (IAsset) {
        return poolData.assets.assetOf(token);
    }

    /* Deposit */

    /**
     * @notice Deposits amount of tokens into pool ensuring deadline
     * @dev Asset needs to be created and added to pool before any operation. This function assumes tax free token.
     * @param token The token address to be deposited
     * @param amount The amount to be deposited
     * @param minimumLiquidity The minimum amount of liquidity to receive
     * @param to The user accountable for deposit, receiving the Wombat assets (lp)
     * @param deadline The deadline to be respected
     * @param shouldStake Whether to stake LP tokens automatically after deposit
     * @return liquidity Total asset liquidity minted
     */
    function deposit(
        IERC20 token,
        uint256 amount,
        uint256 minimumLiquidity,
        address to,
        uint256 deadline,
        bool shouldStake
    ) external override nonReentrant whenNotPaused returns (uint256 liquidity) {
        if (amount == 0) revert WOMBAT_ZERO_AMOUNT();
        _checkAddress(to);
        _ensure(deadline);
        requireAssetNotPaused(address(token));

        IAsset asset = poolData.assets.assetOf(token);
        IERC20(token).safeTransferFrom(address(msg.sender), address(asset), amount);
        address targetAddr = shouldStake ? address(this) : to;

        liquidity = CoreV4.deposit(
            poolData,
            _getGlobalEquilCovRatioForDepositWithdrawal(),
            asset,
            amount.toWad(asset.underlyingTokenDecimals()),
            minimumLiquidity,
            targetAddr
        );

        if (shouldStake) {
            // stake on behalf of the user
            _checkAddress(poolData.masterWombat);

            asset.approve(poolData.masterWombat, liquidity);

            uint256 pid = IMasterWombat(poolData.masterWombat).getAssetPid(address(asset));
            IMasterWombat(poolData.masterWombat).depositFor(pid, liquidity, to);
        }

        emit Deposit(msg.sender, token, amount, liquidity, to);
    }

    /**
     * @notice Quotes potential deposit from pool
     * @dev To be used by frontend
     * @param token The token to deposit by user
     * @param amount The amount to deposit
     * @return liquidity The potential liquidity user would receive
     */
    function quotePotentialDeposit(IERC20 token, uint256 amount) external view override returns (uint256 liquidity) {
        return CoreV4.quotePotentialDeposit(poolData, token, amount, _getGlobalEquilCovRatioForDepositWithdrawal());
    }

    /* Withdraw */

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
        IERC20 token,
        uint256 liquidity,
        uint256 minimumAmount,
        address to,
        uint256 deadline
    ) external override nonReentrant whenNotPaused returns (uint256 amount) {
        _checkLiquidity(liquidity);
        _checkAddress(to);
        _ensure(deadline);

        IAsset asset = poolData.assets.assetOf(token);
        // request lp token from user
        IERC20(asset).safeTransferFrom(address(msg.sender), address(asset), liquidity);
        uint8 decimals = asset.underlyingTokenDecimals();
        (amount, ) = CoreV4.withdraw(
            poolData,
            _getGlobalEquilCovRatioForDepositWithdrawal(),
            asset,
            liquidity,
            minimumAmount.toWad(decimals)
        );
        amount = amount.fromWad(decimals);
        asset.transferUnderlyingToken(to, amount);

        emit Withdraw(msg.sender, token, amount, liquidity, to);
    }

    /**
     * @notice Enables withdrawing liquidity from an asset using LP from a different asset
     * @param fromToken The corresponding token user holds the LP (Asset) from
     * @param toToken The token wanting to be withdrawn (needs to be well covered)
     * @param liquidity The liquidity to be withdrawn (in fromToken decimal)
     * @param minimumAmount The minimum amount that will be accepted by user
     * @param to The user receiving the withdrawal
     * @param deadline The deadline to be respected
     * @return toAmount The total amount withdrawn
     */
    function withdrawFromOtherAsset(
        IERC20 fromToken,
        IERC20 toToken,
        uint256 liquidity,
        uint256 minimumAmount,
        address to,
        uint256 deadline
    ) external override nonReentrant whenNotPaused returns (uint256 toAmount) {
        _checkAddress(to);
        _checkLiquidity(liquidity);
        _checkSameAddress(address(fromToken), address(toToken));
        _ensure(deadline);
        requireAssetNotPaused(address(fromToken));

        // Withdraw and swap
        IAsset fromAsset = poolData.assets.assetOf(fromToken);
        IAsset toAsset = poolData.assets.assetOf(toToken);

        IERC20(fromAsset).safeTransferFrom(address(msg.sender), address(fromAsset), liquidity);
        (uint256 fromAmountInWad, ) = CoreV4.withdraw(
            poolData,
            _getGlobalEquilCovRatioForDepositWithdrawal(),
            fromAsset,
            liquidity,
            0
        );
        uint8 toDecimal = toAsset.underlyingTokenDecimals();

        uint256 toTokenFee;
        (toAmount, toTokenFee) = _swap(fromAsset, toAsset, fromAmountInWad, minimumAmount.toWad(toDecimal));

        toAmount = toAmount.fromWad(toDecimal);
        toTokenFee = toTokenFee.fromWad(toDecimal);
        toAsset.transferUnderlyingToken(to, toAmount);

        uint256 fromAmount = fromAmountInWad.fromWad(fromAsset.underlyingTokenDecimals());
        emit Withdraw(msg.sender, fromToken, fromAmount, liquidity, to);
        emit SwapV2(msg.sender, fromToken, toToken, fromAmount, toAmount, toTokenFee, to);
    }

    /**
     * @notice Quotes potential withdrawal from pool
     * @dev To be used by frontend
     * @param token The token to be withdrawn by user
     * @param liquidity The liquidity (amount of lp assets) to be withdrawn
     * @return amount The potential amount user would receive
     */
    function quotePotentialWithdraw(IERC20 token, uint256 liquidity) external view override returns (uint256 amount) {
        return CoreV4.quotePotentialWithdraw(poolData, _getGlobalEquilCovRatioForDepositWithdrawal(), token, liquidity);
    }

    /**
     * @notice Quotes potential withdrawal from other asset from the pool
     * @dev To be used by frontend
     * The startCovRatio and endCovRatio is set to 0, so no high cov ratio fee is charged
     * This is to be overriden by the HighCovRatioFeePool
     * @param fromToken The corresponding token user holds the LP (Asset) from
     * @param toToken The token wanting to be withdrawn (needs to be well covered)
     * @param liquidity The liquidity (amount of the lp assets) to be withdrawn
     * @return finalAmount The potential amount user would receive
     * @return withdrewAmount The amount of the from-token that is withdrew
     */
    function quotePotentialWithdrawFromOtherAsset(
        IERC20 fromToken,
        IERC20 toToken,
        uint256 liquidity
    ) external view virtual override returns (uint256 finalAmount, uint256 withdrewAmount) {
        IAsset fromAsset = poolData.assets.assetOf(fromToken);
        IAsset toAsset = poolData.assets.assetOf(toToken);
        uint256 scaleFactor = _quoteFactor(fromAsset, toAsset);

        return
            CoreV4.quotePotentialWithdrawFromOtherAsset(
                poolData,
                fromToken,
                toToken,
                liquidity,
                scaleFactor,
                _getGlobalEquilCovRatioForDepositWithdrawal()
            );
    }

    /* Swap */

    /**
     * @notice Return the scale factor that should applied on from-amounts in a swap given
     * the from-asset and the to-asset.
     * @dev not applicable to a plain pool
     * All tokens are assumed to have the same intrinsic value
     * To be overriden by DynamicPool
     */
    function _quoteFactor(
        IAsset, // fromAsset
        IAsset // toAsset
    ) internal view virtual returns (uint256) {
        return 1e18;
    }

    /**
     * @notice Quotes the actual amount user would receive in a swap, taking in account slippage and haircut
     * @param fromAsset The initial asset
     * @param toAsset The asset wanted by user
     * @param fromAmount The amount to quote
     * @return actualToAmount The actual amount user would receive
     * @return toTokenFee The haircut that will be applied
     * To be overriden by HighCovRatioFeePool for reverse-quote
     */
    function _quoteFrom(
        IAsset fromAsset,
        IAsset toAsset,
        int256 fromAmount
    ) internal view virtual returns (uint256 actualToAmount, uint256 toTokenFee) {
        uint256 scaleFactor = _quoteFactor(fromAsset, toAsset);
        return CoreV4.quoteSwap(fromAsset, toAsset, fromAmount, poolData.ampFactor, scaleFactor, poolData.haircutRate);
    }

    /**
     * expect fromAmount and minimumToAmount to be in WAD
     */
    function _swap(
        IAsset fromAsset,
        IAsset toAsset,
        uint256 fromAmount,
        uint256 minimumToAmount
    ) internal returns (uint256 actualToAmount, uint256 toTokenFee) {
        (actualToAmount, toTokenFee) = _quoteFrom(fromAsset, toAsset, fromAmount.toInt256());
        CoreV4.performSwap(poolData, fromAsset, toAsset, fromAmount, minimumToAmount, actualToAmount, toTokenFee);
        _postSwapHook();
    }

    /**
     * @notice This function is called after a swap, to be overridden
     */
    function _postSwapHook() internal virtual {}

    /**
     * @notice Swap fromToken for toToken, ensures deadline and minimumToAmount and sends quoted amount to `to` address
     * @dev This function assumes tax free token.
     * @param fromToken The token being inserted into Pool by user for swap
     * @param toToken The token wanted by user, leaving the Pool
     * @param fromAmount The amount of from token inserted
     * @param minimumToAmount The minimum amount that will be accepted by user as result
     * @param to The user receiving the result of swap
     * @param deadline The deadline to be respected
     */
    function swap(
        IERC20 fromToken,
        IERC20 toToken,
        uint256 fromAmount,
        uint256 minimumToAmount,
        address to,
        uint256 deadline
    ) external virtual override nonReentrant whenNotPaused returns (uint256 actualToAmount, uint256 haircut) {
        _checkSameAddress(address(fromToken), address(toToken));
        if (fromAmount == 0) revert WOMBAT_ZERO_AMOUNT();
        _checkAddress(to);
        _ensure(deadline);
        requireAssetNotPaused(address(fromToken));

        IAsset fromAsset = poolData.assets.assetOf(fromToken);
        IAsset toAsset = poolData.assets.assetOf(toToken);

        uint8 toDecimal = toAsset.underlyingTokenDecimals();

        (actualToAmount, haircut) = _swap(
            fromAsset,
            toAsset,
            fromAmount.toWad(fromAsset.underlyingTokenDecimals()),
            minimumToAmount.toWad(toDecimal)
        );

        actualToAmount = actualToAmount.fromWad(toDecimal);
        haircut = haircut.fromWad(toDecimal);

        IERC20(fromToken).safeTransferFrom(msg.sender, address(fromAsset), fromAmount);
        toAsset.transferUnderlyingToken(to, actualToAmount);

        emit SwapV2(msg.sender, fromToken, toToken, fromAmount, actualToAmount, haircut, to);
    }

    /**
     * @notice Given an input asset amount and token addresses, calculates the
     * maximum output token amount (accounting for fees and slippage).
     * @dev In reverse quote, the haircut is in the `fromAsset`
     * @param fromToken The initial ERC20 token
     * @param toToken The token wanted by user
     * @param fromAmount The given input amount
     * @return potentialOutcome The potential amount user would receive
     * @return haircut The haircut that would be applied
     */
    function quotePotentialSwap(
        IERC20 fromToken,
        IERC20 toToken,
        int256 fromAmount
    ) public view override returns (uint256 potentialOutcome, uint256 haircut) {
        _checkSameAddress(address(fromToken), address(toToken));
        if (fromAmount == 0) revert WOMBAT_ZERO_AMOUNT();

        IAsset fromAsset = poolData.assets.assetOf(fromToken);
        IAsset toAsset = poolData.assets.assetOf(toToken);

        fromAmount = fromAmount.toWad(fromAsset.underlyingTokenDecimals());
        (potentialOutcome, haircut) = _quoteFrom(fromAsset, toAsset, fromAmount);
        potentialOutcome = potentialOutcome.fromWad(toAsset.underlyingTokenDecimals());
        if (fromAmount >= 0) {
            haircut = haircut.fromWad(toAsset.underlyingTokenDecimals());
        } else {
            haircut = haircut.fromWad(fromAsset.underlyingTokenDecimals());
        }
    }

    /**
     * @notice Returns the minimum input asset amount required to buy the given output asset amount
     * (accounting for fees and slippage)
     * @dev To be used by frontend
     * @param fromToken The initial ERC20 token
     * @param toToken The token wanted by user
     * @param toAmount The given output amount
     * @return amountIn The input amount required
     * @return haircut The haircut that would be applied
     */
    function quoteAmountIn(
        IERC20 fromToken,
        IERC20 toToken,
        int256 toAmount
    ) external view override returns (uint256 amountIn, uint256 haircut) {
        return quotePotentialSwap(toToken, fromToken, -toAmount);
    }

    /* Queries */

    /**
     * @notice Returns the exchange rate of the LP token
     * @param token The address of the token
     * @return xr The exchange rate of LP token
     */
    function exchangeRate(IERC20 token) external view returns (uint256 xr) {
        IAsset asset = poolData.assets.assetOf(token);
        if (asset.totalSupply() == 0) return WAD;
        return xr = uint256(asset.liability()).wdiv(uint256(asset.totalSupply()));
    }

    function globalEquilCovRatio() public view virtual returns (int256 equilCovRatio, int256 invariant) {
        return CoreV4.globalEquilCovRatioForStablePool(poolData);
    }

    /**
     * @dev return balance in WAD
     */
    function tipBucketBalance(IERC20 token) public view returns (uint256 balance) {
        return CoreV4.tipBucketBalance(poolData, token);
    }

    /* Utils */

    /**
     * For stable pools and rather-stable pools, r* is assumed to be 1 to simplify calculation
     */
    function _getGlobalEquilCovRatioForDepositWithdrawal() internal view virtual returns (int256 equilCovRatio) {
        return WAD_I;
    }

    /**
     * @notice Send fee collected to the fee beneficiary
     * @param token The address of the token to collect fee
     */
    function mintFee(IERC20 token) external returns (uint256 feeCollected) {
        return CoreV4.mintFee(poolData, poolData.assets.assetOf(token), _getGlobalEquilCovRatioForDepositWithdrawal());
    }

    /* Getters */

    function ampFactor() external view returns (uint256) {
        return poolData.ampFactor;
    }

    function haircutRate() external view returns (uint256) {
        return poolData.haircutRate;
    }

    function retentionRatio() external view returns (uint256) {
        return poolData.retentionRatio;
    }

    function lpDividendRatio() external view returns (uint256) {
        return poolData.lpDividendRatio;
    }

    function mintFeeThreshold() external view returns (uint256) {
        return poolData.mintFeeThreshold;
    }

    function dev() external view returns (address) {
        return poolData.dev;
    }

    function feeTo() external view returns (address) {
        return poolData.feeTo;
    }

    function masterWombat() external view returns (address) {
        return poolData.masterWombat;
    }

    function withdrawalHaircutRate() external view returns (uint256) {
        return poolData.withdrawalHaircutRate;
    }
}
