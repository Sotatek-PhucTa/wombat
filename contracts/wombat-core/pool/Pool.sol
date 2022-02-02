// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.5;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

import '../interfaces/IAsset.sol';
import './CoreV2.sol';
import './PausableAssets.sol';

/**
 * @title Pool
 * @notice Manages deposits, withdrawals and swaps. Holds a mapping of assets and parameters.
 * @dev The main entry-point of Wombat protocol
 * Note: There are 2 operating mode. Either set shouldEnableExactDeposit to true and maintain global cov ratio (r*) at 1.
 * Or set shouldEnableExactDeposit to false, and allow r* to be any value > 1.
 */
contract Pool is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    PausableAssets,
    CoreV2
{
    using DSMath for uint256;
    using SafeERC20 for IERC20;
    using SignedSafeMath for int256;

    /// @notice Asset Map struct holds assets
    struct AssetMap {
        address[] keys;
        mapping(address => IAsset) values;
        mapping(address => uint256) indexOf;
    }

    /// @notice Amplification factor
    uint256 public ampFactor = 5 * 10**16; // 0.05 for amplification factor

    /// @notice Haircut rate
    uint256 public haircutRate = 4 * 10**14; // 0.0004, i.e. 0.04% for intra-aggregate account stableswap

    /// @notice Retention ratio
    uint256 public retentionRatio = WAD;

    /// @notice Dev address
    address public dev;

    /// @notice A record of assets inside Pool
    AssetMap private _assets;

    address public feeTo;

    /// @notice Indicate if we should distribute retention to LP stakers or leave it in the pool
    bool public shouldDistributeRetention;

    bool public shouldEnableExactDeposit = true;

    /// @notice Dividend collected by each asset (unit: underlying token)
    mapping(IAsset => uint256) private _feeCollected;

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

    error WOMBAT_FORBIDDEN();
    error WOMBAT_EXPIRED();

    error WOMBAT_ASSET_NOT_EXISTS();
    error WOMBAT_ASSET_EXIST();

    error WOMBAT_ZERO_ADDRESS();
    error WOMBAT_ZERO_AMOUNT();
    error WOMBAT_ZERO_LIQUIDITY();
    error WOMBAT_INVALID_VALUE();
    error WOMBAT_SAME_ADDRESS();
    error WOMBAT_AMOUNT_TOO_LOW();
    error WOMBAT_COV_RATIO_TOO_LOW();
    error WOMBAT_CASH_NOT_ENOUGH();
    error WOMBAT_INTERPOOL_SWAP_NOT_SUPPORTED();

    /// @dev Modifier ensuring that certain function can only be called by developer
    modifier onlyDev() {
        if (dev != msg.sender) revert WOMBAT_FORBIDDEN();
        _;
    }

    /// @dev Modifier ensuring a certain deadline for a function to complete execution
    modifier ensure(uint256 deadline) {
        if (deadline < block.timestamp) revert WOMBAT_EXPIRED();
        _;
    }

    /**
     * @notice Initializes pool. Dev is set to be the account calling this function.
     */
    function initialize() external initializer {
        __Ownable_init();
        __ReentrancyGuard_init_unchained();
        __Pausable_init_unchained();

        dev = msg.sender;
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
     * @param dev_ new contract dev address
     */
    function setDev(address dev_) external onlyOwner {
        if (dev_ == address(0)) revert WOMBAT_ZERO_ADDRESS();
        dev = dev_;
    }

    /**
     * @notice Changes the pools amplification factor. Can only be set by the contract owner.
     * @param ampFactor_ new pool's amplification factor
     */
    function setAmpFactor(uint256 ampFactor_) external onlyOwner {
        if (ampFactor_ > WAD) revert WOMBAT_INVALID_VALUE(); // ampFactor_ should not be set bigger than 1
        ampFactor = ampFactor_;
    }

    /**
     * @notice Changes the pools haircutRate. Can only be set by the contract owner.
     * @param haircutRate_ new pool's haircutRate_
     */
    function setHaircutRate(uint256 haircutRate_) external onlyOwner {
        if (haircutRate_ > WAD) revert WOMBAT_INVALID_VALUE(); // haircutRate_ should not be set bigger than 1
        haircutRate = haircutRate_;
    }

    /**
     * @notice Changes the pools retentionRatio. Can only be set by the contract owner.
     * @param retentionRatio_ new pool's retentionRatio
     */
    function setRetentionRatio(uint256 retentionRatio_) external onlyOwner {
        if (retentionRatio_ > WAD) revert WOMBAT_INVALID_VALUE(); // retentionRatio_ should not be bigger than 1
        mintAllFee();
        retentionRatio = retentionRatio_;
    }

    /**
     * @notice Changes the fee beneficiary. Can only be set by the contract owner.
     * This value cannot be set to 0 to avoid unsettled fee.
     * @param feeTo_ new fee beneficiary
     */
    function setFeeTo(address feeTo_) external onlyOwner {
        if (feeTo_ == address(0)) revert WOMBAT_INVALID_VALUE();
        feeTo = feeTo_;
    }

    function setShouldDistributeRetention(bool shouldDistributeRetention_) external onlyOwner {
        if (shouldDistributeRetention_ == shouldDistributeRetention) revert WOMBAT_INVALID_VALUE();
        mintAllFee();
        shouldDistributeRetention = shouldDistributeRetention_;
    }

    /**
     * @notice Enable exact deposit
     * Should only be enabled when r* = 1
     */
    function setShouldEnableExactDeposit(bool shouldEnableExactDeposit_) external onlyOwner {
        if (shouldEnableExactDeposit_ && !shouldDistributeRetention) revert WOMBAT_FORBIDDEN();
        shouldEnableExactDeposit = shouldEnableExactDeposit_;
        mintAllFee();
    }

    /* Assets */

    /**
     * @notice Adds asset to pool, reverts if asset already exists in pool
     * @param token The address of token
     * @param asset The address of the Wombat Asset contract
     */
    function addAsset(address token, address asset) external onlyOwner nonReentrant {
        if (asset == address(0)) revert WOMBAT_ZERO_ADDRESS();
        if (token == address(0)) revert WOMBAT_ZERO_ADDRESS();
        _addAsset(token, asset);
    }

    /**
     * @notice Adds asset to pool, reverts if asset already exists in pool
     * @param token The address of token
     * @param asset The address of the Wombat Asset contract
     */
    function _addAsset(address token, address asset) private {
        if (asset == address(0)) revert WOMBAT_ZERO_ADDRESS();
        if (_containsAsset(token)) revert WOMBAT_ASSET_EXIST();

        _assets.values[token] = IAsset(asset);
        _assets.indexOf[token] = _assets.keys.length;
        _assets.keys.push(token);

        emit AssetAdded(token, asset);
    }

    /**
     * @notice Removes asset from asset struct
     * @dev Can only be called by owner
     * @param key The address of token to remove
     */
    function removeAsset(address key) external onlyOwner {
        if (!_containsAsset(key)) revert WOMBAT_ASSET_NOT_EXISTS();

        delete _assets.values[key];

        uint256 index = _assets.indexOf[key];
        uint256 lastIndex = _assets.keys.length - 1;
        address lastKey = _assets.keys[lastIndex];

        _assets.indexOf[lastKey] = index;
        delete _assets.indexOf[key];

        _assets.keys[index] = lastKey;
        _assets.keys.pop();
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
    function _getAsset(address key) private view returns (IAsset) {
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
        return _assets.values[token] != IAsset(address(0));
    }

    /**
     * @notice Gets Asset corresponding to ERC20 token. Reverts if asset does not exists in Pool.
     * @param token The address of ERC20 token
     */
    function _assetOf(address token) private view returns (IAsset) {
        if (!_containsAsset(token)) revert WOMBAT_ASSET_NOT_EXISTS();
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

    /* Deposit */

    /**
     * This functinos approximate the amount of liquidity of the deposit regardless of value of r*.
     * Fee could be positive of negative
     */
    function _depositTo(IAsset asset, uint256 amount)
        internal
        view
        returns (
            uint256 liquidity,
            uint256 liabilityToMint,
            int256 fee
        )
    {
        uint256 totalSupply = asset.totalSupply();
        uint256 liability = asset.liability();

        // TODO: confirm we don't do exact deposit?
        int256 reward = _depositReward(int256(amount), asset);

        if (reward < 0) {
            // TODO: confirm we don't distribute deposit reward
            fee = -reward;
        }

        liabilityToMint = uint256(int256(amount) - fee);

        // Calculate amount of LP to mint : ( deposit + reward ) * TotalAssetSupply / Liability
        liquidity = (liability == 0 ? liabilityToMint : (liabilityToMint * totalSupply) / liability);
    }

    /**
     * This function calculate the exactly amount of liquidity of the deposit. Assumes r* = 1
     */
    function _exactDepositTo(IAsset asset, uint256 amount)
        internal
        view
        returns (
            uint256 liquidity,
            uint256 liabilityToMint,
            int256 fee
        )
    {
        uint256 totalSupply = asset.totalSupply();
        uint256 liability = asset.liability();

        fee = -_exactDepositReward(int256(amount), asset);
        if (fee > 0) revert WOMBAT_INVALID_VALUE();

        liabilityToMint = uint256(int256(amount) - fee);

        // Calculate amount of LP to mint : ( deposit + reward ) * TotalAssetSupply / Liability
        liquidity = (liability == 0 ? liabilityToMint : (liabilityToMint * totalSupply) / liability);
    }

    /**
     * @notice Deposits asset in Pool
     * @param asset The asset to be deposited
     * @param amount The amount to be deposited
     * @param to The user accountable for deposit, receiving the Wombat assets (lp)
     * @return liquidity Total asset liquidity minted
     */
    function _deposit(
        IAsset asset,
        uint256 amount,
        address to
    ) internal returns (uint256 liquidity) {
        if (to == address(0)) revert WOMBAT_ZERO_ADDRESS();

        // collect fee before deposit
        _mintFee(asset);

        uint256 liabilityToMint;

        (liquidity, liabilityToMint, ) = shouldEnableExactDeposit
            ? _exactDepositTo(asset, amount)
            : _depositTo(asset, amount);

        if (liquidity == 0) revert WOMBAT_ZERO_LIQUIDITY();

        asset.addCash(amount);
        asset.addLiability(liabilityToMint);
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
        if (amount == 0) revert WOMBAT_ZERO_AMOUNT();
        if (to == address(0)) revert WOMBAT_ZERO_ADDRESS();
        requireAssetNotPaused(token);

        IERC20 erc20 = IERC20(token);
        IAsset asset = _assetOf(token);

        erc20.safeTransferFrom(address(msg.sender), address(asset), amount);
        liquidity = _deposit(asset, amount, to);

        emit Deposit(msg.sender, token, amount, liquidity, to);
    }

    /**
     * @notice Quotes potential deposit from pool
     * @dev To be used by frontend
     * @param token The token to deposit by user
     * @param amount The amount to deposit
     * @return liquidity The potential liquidity user would receive
     * @return fee The fee that would be applied
     */
    function quotePotentialDeposit(address token, uint256 amount)
        external
        view
        returns (uint256 liquidity, int256 fee)
    {
        IAsset asset = _assetOf(token);
        (liquidity, , fee) = _depositTo(asset, amount);
    }

    /* Withdraw */

    /**
     * @notice Calculates fee and liability to burn in case of withdrawal
     * @param asset The asset willing to be withdrawn
     * @param liquidity The liquidity willing to be withdrawn
     * @return amount Total amount to be withdrawn from Pool
     * @return liabilityToBurn Total liability to be burned by Pool
     * @return fee
     * @return enoughCash
     */
    function _withdrawFrom(IAsset asset, uint256 liquidity)
        private
        view
        returns (
            uint256 amount,
            uint256 liabilityToBurn,
            int256 fee,
            bool enoughCash
        )
    {
        liabilityToBurn = (asset.liability() * liquidity) / asset.totalSupply();
        if (liabilityToBurn == 0) revert WOMBAT_ZERO_LIQUIDITY();

        // overflow is unrealistic
        int256 L_i = int256(liabilityToBurn);

        fee = _withdrawalFee(L_i, asset);

        // Prevent underflow in case withdrawal fees >= liabilityToBurn, user would only burn his underlying liability
        if (L_i > fee) {
            if (asset.cash() < uint256(L_i - fee)) {
                amount = asset.cash(); // When asset does not contain enough cash, just withdraw the remaining cash
                fee = 0;
                enoughCash = false;
            } else {
                amount = uint256(L_i - fee); // There is enough cash, standard withdrawal
                enoughCash = true;
            }
        } else {
            fee = L_i;
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
        IAsset asset,
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

        if (minimumAmount > amount) revert WOMBAT_AMOUNT_TOO_LOW();

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
        if (liquidity == 0) revert WOMBAT_ZERO_LIQUIDITY();
        if (to == address(0)) revert WOMBAT_ZERO_ADDRESS();

        IAsset asset = _assetOf(token);
        amount = _withdraw(asset, liquidity, minimumAmount, to);

        emit Withdraw(msg.sender, token, amount, liquidity, to);
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
        returns (
            uint256 amount,
            int256 fee,
            bool enoughCash
        )
    {
        if (liquidity == 0) revert WOMBAT_ZERO_LIQUIDITY();

        IAsset asset = _assetOf(token);
        (amount, , fee, enoughCash) = _withdrawFrom(asset, liquidity);
    }

    /**
     * @notice Enables withdrawing liquidity from an asset using LP from a different asset in the same aggregate
     * @param fromToken The corresponding token user holds the LP (Asset) from
     * @param toToken The token wanting to be withdrawn (needs to be well covered)
     * @param liquidity The liquidity to be withdrawn (in toToken decimal)
     * @param minimumAmount The minimum amount that will be accepted by user
     * @param receipient The user receiving the withdrawal
     * @param deadline The deadline to be respected
     * @dev fromToken and toToken assets' must be in the same aggregate
     * @dev Also, coverage ratio of toAsset must be higher than 1 after withdrawal for this to be accepted
     * @return amount The total amount withdrawn
     */
    function withdrawFromOtherAsset(
        address fromToken,
        address toToken,
        uint256 liquidity,
        uint256 minimumAmount,
        address receipient,
        uint256 deadline
    ) external ensure(deadline) nonReentrant whenNotPaused returns (uint256 amount) {
        if (receipient == address(0)) revert WOMBAT_ZERO_ADDRESS();
        if (liquidity == 0) revert WOMBAT_ZERO_LIQUIDITY();

        IAsset fromAsset = _assetOf(fromToken);
        IAsset toAsset = _assetOf(toToken);
        if (toAsset.aggregateAccount() != fromAsset.aggregateAccount()) revert WOMBAT_INTERPOOL_SWAP_NOT_SUPPORTED();
        bool enoughCash;
        (amount, , , enoughCash) = _withdrawFrom(toAsset, liquidity);
        if (!enoughCash) revert WOMBAT_CASH_NOT_ENOUGH();
        if ((toAsset.cash() - amount).wdiv(toAsset.liability()) < WAD) revert WOMBAT_COV_RATIO_TOO_LOW();
        if (minimumAmount > amount) revert WOMBAT_AMOUNT_TOO_LOW();

        // Burn LP from user and trasnfer token.
        // Note: Convert liquidity and liability to fromAsset decimal.
        uint256 liquidityFromAsset = (liquidity * 10**fromAsset.decimals()) / (10**toAsset.decimals());
        IERC20(fromAsset).safeTransferFrom(address(msg.sender), address(fromAsset), liquidityFromAsset);
        uint256 liabilityToBurn = (liquidityFromAsset * fromAsset.liability()) / toAsset.totalSupply();
        fromAsset.burn(address(fromAsset), liquidityFromAsset);
        fromAsset.removeLiability(liabilityToBurn);
        toAsset.removeCash(amount);
        toAsset.transferUnderlyingToken(receipient, amount);

        emit Withdraw(msg.sender, toToken, amount, liquidityFromAsset, receipient);
    }

    /**
     * @notice Quotes potential withdrawal from other asset in the same aggregate
     * @dev To be used by frontend. Reverts if not possible
     * @param fromToken The users holds LP corresponding to this initial token
     * @param toToken The token to be withdrawn by user
     * @param liquidity The liquidity (amount of lp assets) to be withdrawn (in toToken decimal).
     * @return amount The potential amount user would receive
     * @return fee The fee that would be applied
     */
    function quotePotentialWithdrawFromOtherAsset(
        address fromToken,
        address toToken,
        uint256 liquidity
    )
        external
        view
        returns (
            uint256 amount,
            int256 fee,
            bool enoughCash
        )
    {
        if (fromToken == toToken) revert WOMBAT_SAME_ADDRESS();
        if (liquidity == 0) revert WOMBAT_ZERO_LIQUIDITY();

        IAsset fromAsset = _assetOf(fromToken);
        IAsset toAsset = _assetOf(toToken);
        if (fromAsset.aggregateAccount() != toAsset.aggregateAccount()) revert WOMBAT_INTERPOOL_SWAP_NOT_SUPPORTED();
        (amount, , fee, enoughCash) = _withdrawFrom(toAsset, liquidity);
        if (!enoughCash) revert WOMBAT_CASH_NOT_ENOUGH();
        if ((toAsset.cash() - amount).wdiv(toAsset.liability()) < WAD) revert WOMBAT_COV_RATIO_TOO_LOW();
    }

    /* Swap */

    /**
     * @notice Quotes the ideal amount in case of swap
     * @dev Does not take into haircut or other fees
     * @param fromAsset The initial asset
     * @param toAsset The asset wanted by user
     * @param fromAmount The amount to quote
     * @return idealToAmount The ideal amount user would receive
     */
    function _quoteIdealToAmount(
        IAsset fromAsset,
        IAsset toAsset,
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
        if (Lx == 0) revert WOMBAT_ZERO_LIQUIDITY();

        uint256 idealToAmountInWAD = _swapQuoteFunc(Ax, Ay, Lx, Ly, fromAmountInWAD, ampFactor);
        idealToAmount = _convertFromWAD(dTo, idealToAmountInWAD);
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
        IAsset fromAsset,
        IAsset toAsset,
        uint256 fromAmount
    ) private view returns (uint256 actualToAmount, uint256 haircut) {
        uint256 idealToAmount = _quoteIdealToAmount(fromAsset, toAsset, fromAmount);
        if (toAsset.cash() < idealToAmount) revert WOMBAT_CASH_NOT_ENOUGH();

        haircut = idealToAmount.wmul(haircutRate);
        actualToAmount = idealToAmount - haircut;
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
        if (fromToken == toToken) revert WOMBAT_SAME_ADDRESS();
        if (fromAmount == 0) revert WOMBAT_ZERO_AMOUNT();
        if (to == address(0)) revert WOMBAT_ZERO_ADDRESS();
        requireAssetNotPaused(fromToken);

        IERC20 fromERC20 = IERC20(fromToken);
        IAsset fromAsset = _assetOf(fromToken);
        IAsset toAsset = _assetOf(toToken);

        // Intrapool swapping only
        if (fromAsset.aggregateAccount() != toAsset.aggregateAccount()) revert WOMBAT_INTERPOOL_SWAP_NOT_SUPPORTED();

        (uint256 actualToAmount, uint256 haircut) = _quoteFrom(fromAsset, toAsset, fromAmount);
        if (minimumToAmount > actualToAmount) revert WOMBAT_AMOUNT_TOO_LOW();

        _feeCollected[toAsset] += haircut;

        emit Swap(msg.sender, fromToken, toToken, fromAmount, actualToAmount, to);
        fromERC20.safeTransferFrom(address(msg.sender), address(fromAsset), fromAmount);
        fromAsset.addCash(fromAmount);
        toAsset.transferUnderlyingToken(to, actualToAmount);

        if (shouldEnableExactDeposit) {
            // haircut is removed from cash to maintain r* = 1. It is distributed during _mintFee()
            toAsset.removeCash(actualToAmount + haircut);
        } else {
            // haircut is distributed in the form of LP token to beneficiary during _mintFee()
            toAsset.removeCash(actualToAmount);
        }
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
    ) external view returns (uint256 potentialOutcome, uint256 haircut) {
        if (fromToken == toToken) revert WOMBAT_SAME_ADDRESS();
        if (fromAmount == 0) revert WOMBAT_ZERO_AMOUNT();

        IAsset fromAsset = _assetOf(fromToken);
        IAsset toAsset = _assetOf(toToken);

        // Intrapool swapping only
        if (fromAsset.aggregateAccount() != toAsset.aggregateAccount()) revert WOMBAT_INTERPOOL_SWAP_NOT_SUPPORTED();

        (potentialOutcome, haircut) = _quoteFrom(fromAsset, toAsset, fromAmount);
    }

    /* Queries */

    /**
     * @notice Returns the exchange rate of the LP token
     * @param asset The address of the LP token
     * @return exchangeRate
     */
    function exchangeRate(IAsset asset) external view returns (uint256 exchangeRate) {
        if (asset.totalSupply() == 0) return 1;
        return exchangeRate = asset.liability() / asset.totalSupply();
    }

    function globalEquilCovRatio() external view returns (uint256 equilCovRatio, uint256 invariant) {
        int256 A = int256(ampFactor);

        int256 D;
        int256 SL;
        (D, SL) = _globalInvariantFunc(A);

        int256 er = _equilCovRatio(D, SL, A);
        return (uint256(er), uint256(D));
    }

    // function surplus() external view returns (int256 surplus) {
    //     uint256 SA;
    //     uint256 SL;
    //     for (uint256 i = 0; i < _sizeOfAssetList(); i++) {
    //         IAsset asset = _getAsset(_getKeyAtIndex(i));

    //         // overflow is unrealistic
    //         uint8 d = asset.decimals();
    //         SA += _convertToWAD(d, asset.cash());
    //         SL += _convertToWAD(d, asset.liability());
    //     }
    //     surplus = int256(SA) - int256(SL);
    // }

    /* Utils */

    function _depositReward(int256 amount, IAsset asset) internal view returns (int256 reward) {
        // overflow is unrealistic
        uint8 d = asset.decimals();
        int256 L_i = int256(_convertToWAD(d, asset.liability()));
        if (L_i == 0) return 0;

        int256 delta_i = _convertToWAD(d, amount);
        int256 A_i = int256(_convertToWAD(d, asset.cash()));
        int256 A = int256(ampFactor);

        (int256 D, int256 SL) = _globalInvariantFunc(A);
        int256 w = depositRewardImpl(SL, delta_i, A_i, L_i, D, A);

        reward = _convertFromWAD(d, w);
    }

    function _exactDepositReward(int256 amount, IAsset asset) internal view returns (int256 reward) {
        // overflow is unrealistic
        uint8 d = asset.decimals();
        int256 L_i = int256(_convertToWAD(d, asset.liability()));
        if (L_i == 0) return 0;
        int256 A_i = int256(_convertToWAD(d, asset.cash()));
        int256 D_i = _convertToWAD(d, amount);
        int256 A = int256(ampFactor);

        int256 w = exactDepositRewardImpl(D_i, A_i, L_i, A);

        reward = _convertFromWAD(d, w);
    }

    function _withdrawalFee(int256 amount, IAsset asset) internal view returns (int256 fee) {
        fee = -_depositReward(-amount, asset);
    }

    function _globalInvariantFunc(int256 A) internal view returns (int256 D, int256 SL) {
        for (uint256 i = 0; i < _sizeOfAssetList(); i++) {
            IAsset asset = _getAsset(_getKeyAtIndex(i));

            // overflow is unrealistic
            uint8 d = asset.decimals();
            int256 A_i = int256(_convertToWAD(d, asset.cash()));
            int256 L_i = int256(_convertToWAD(d, asset.liability()));

            // Assume when L_i == 0, A_i always == 0
            if (L_i == 0) {
                // avoid division of 0
                continue;
            }

            int256 r_i = A_i.wdiv(L_i);
            SL += L_i;
            D += L_i.wmul(r_i - A.wdiv(r_i));
        }
    }

    /**
     * @notice Private function to send fee collected to the fee beneficiary
     * @param asset The address of the asset to collect fee
     */
    function _mintFee(IAsset asset) private {
        uint256 feeCollected = _feeCollected[asset];
        if (feeCollected == 0) {
            // early return
            // we might set a threshold to save gas cost
            return;
        }

        if (shouldEnableExactDeposit) {
            uint256 dividend = _dividend(feeCollected, retentionRatio);
            if (feeCollected - dividend > 0) {
                // strictly control r* to be 1
                // increase the value of the LP token, i.e. assetsPerShare
                (, uint256 liabilityToMint, ) = _exactDepositTo(asset, feeCollected - dividend);
                asset.addLiability(liabilityToMint);
                asset.addCash(feeCollected - dividend);
            }
            asset.transferUnderlyingToken(feeTo, dividend);
        } else {
            uint256 dividend = _dividend(feeCollected, retentionRatio);
            uint256 liabilityToMint = shouldDistributeRetention ? feeCollected : dividend;
            _feeCollected[asset] = 0;
            if (dividend > 0) {
                // call totalSupply() and liability() before mint()
                asset.mint(feeTo, (dividend * asset.totalSupply()) / asset.liability());
            }
            asset.addLiability(liabilityToMint);
        }
    }

    function mintAllFee() internal {
        for (uint256 i = 0; i < _sizeOfAssetList(); i++) {
            IAsset asset = _getAsset(_getKeyAtIndex(i));
            _mintFee(asset);
        }
    }

    /**
     * @notice Send fee collected to the fee beneficiary
     * @param asset The address of the asset to collect fee
     */
    function mintFee(IAsset asset) external {
        _mintFee(asset);
    }
}
