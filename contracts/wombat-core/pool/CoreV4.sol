// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import './PoolV4Data.sol';
import '../interfaces/IRelativePriceProvider.sol';
import '../libraries/DSMath.sol';
import '../libraries/SignedSafeMath.sol';
import '../../wombat-governance/libraries/LogExpMath.sol';

/**
 * @title Core
 * @notice Handles math operations of Wombat protocol. Assume all params are signed integer with 18 decimals
 * @dev Uses OpenZeppelin's SignedSafeMath and DSMath's WAD for calculations.
 * Note: Internal functions are for testing purpose
 * Change log:
 * - Move view functinos (quotes, high cov ratio fee) from the Pool contract to this contract
 * - Add quote functions for cross chain swaps
 */
library CoreV4 {
    using AssetLibrary for AssetLibrary.AssetMap;
    using DSMath for uint256;
    using SignedSafeMath for int256;
    using SignedSafeMath for uint256;

    int256 private constant WAD_I = 10 ** 18;
    uint256 private constant WAD = 10 ** 18;

    //#region Error

    error CORE_UNDERFLOW();
    error CORE_INVALID_VALUE();
    error CORE_INVALID_HIGH_COV_RATIO_FEE();
    error CORE_ZERO_LIQUIDITY();
    error CORE_CASH_NOT_ENOUGH();
    error CORE_COV_RATIO_LIMIT_EXCEEDED();

    error WOMBAT_FORBIDDEN();

    error WOMBAT_ZERO_ADDRESS();
    error WOMBAT_AMOUNT_TOO_LOW();
    error WOMBAT_ZERO_LIQUIDITY();
    error WOMBAT_SAME_ADDRESS();

    //#endregion Error

    //#region Modifier

    function _checkLiquidity(uint256 liquidity) private pure {
        if (liquidity == 0) revert WOMBAT_ZERO_LIQUIDITY();
    }

    function _checkAddress(address to) private pure {
        if (to == address(0)) revert WOMBAT_ZERO_ADDRESS();
    }

    function _checkSameAddress(address from, address to) private pure {
        if (from == to) revert WOMBAT_SAME_ADDRESS();
    }

    function _checkAmount(uint256 minAmt, uint256 amt) private pure {
        if (minAmt > amt) revert WOMBAT_AMOUNT_TOO_LOW();
    }

    //#endregion Modifier

    //#region Swap Logic

    /**
     * expect fromAmount and minimumToAmount to be in WAD
     */
    function performSwap(
        PoolV4Data storage poolData,
        IAsset fromAsset,
        IAsset toAsset,
        uint256 fromAmount,
        uint256 minimumToAmount,
        uint256 actualToAmount,
        uint256 toTokenFee
    ) external {
        _checkAmount(minimumToAmount, actualToAmount);

        _accumulateFee(poolData, toAsset, toTokenFee);

        fromAsset.addCash(fromAmount);

        // haircut is removed from cash to maintain r* = 1. It is distributed during _mintFee()

        toAsset.removeCash(actualToAmount + toTokenFee);

        // mint fee is skipped for swap to save gas,

        // revert if cov ratio < 1% to avoid precision error
        if (uint256(toAsset.cash()).wdiv(toAsset.liability()) < WAD / 100) revert WOMBAT_FORBIDDEN();
    }

    /**
     * @notice Quotes the actual amount user would receive in a swap, taking in account slippage and haircut
     * @param fromAsset The initial asset
     * @param toAsset The asset wanted by user
     * @param fromAmount The amount to quote
     * @param scaleFactor the relative price that should applied on from-amounts in a swap
     * @return actualToAmount The actual amount user would receive
     * @return haircut The haircut that will be applied
     */
    function quoteSwap(
        IAsset fromAsset,
        IAsset toAsset,
        int256 fromAmount,
        uint256 ampFactor,
        uint256 scaleFactor,
        uint256 haircutRate
    ) public view returns (uint256 actualToAmount, uint256 haircut) {
        // exact output swap quote should count haircut before swap
        if (fromAmount < 0) {
            fromAmount = fromAmount.wdiv(WAD_I - int256(haircutRate));
        }

        uint256 fromCash = uint256(fromAsset.cash());
        uint256 fromLiability = uint256(fromAsset.liability());
        uint256 toCash = uint256(toAsset.cash());

        if (scaleFactor != WAD) {
            // apply scale factor on from-amounts
            fromCash = (fromCash * scaleFactor) / 1e18;
            fromLiability = (fromLiability * scaleFactor) / 1e18;
            fromAmount = (fromAmount * scaleFactor.toInt256()) / 1e18;
        }

        uint256 idealToAmount = _swapQuoteFunc(
            fromCash.toInt256(),
            toCash.toInt256(),
            fromLiability.toInt256(),
            int256(uint256(toAsset.liability())),
            fromAmount,
            ampFactor.toInt256()
        );
        if ((fromAmount > 0 && toCash < idealToAmount) || (fromAmount < 0 && fromAsset.cash() < uint256(-fromAmount))) {
            revert CORE_CASH_NOT_ENOUGH();
        }

        if (fromAmount > 0) {
            // normal quote
            haircut = idealToAmount.wmul(haircutRate);
            actualToAmount = idealToAmount - haircut;
        } else {
            // exact output swap quote count haircut in the fromAmount
            actualToAmount = idealToAmount;
            haircut = uint256(-fromAmount).wmul(haircutRate);
        }
    }

    /**
     * @dev Exact output swap (fromAmount < 0) should be only used by off-chain quoting function as it is a gas monster
     */
    function quoteSwapForHighCovRatioPool(
        PoolV4Data storage poolData,
        IAsset fromAsset,
        IAsset toAsset,
        int256 fromAmount,
        uint256 scaleFactor
    ) public view returns (uint256 actualToAmount, uint256 toTokenFee) {
        (actualToAmount, toTokenFee) = quoteSwap(
            fromAsset,
            toAsset,
            fromAmount,
            poolData.ampFactor,
            scaleFactor,
            poolData.haircutRate
        );

        if (poolData.endCovRatio == 0) {
            // early return without taking high cov ratio fee into account
            return (actualToAmount, toTokenFee);
        }

        if (fromAmount >= 0) {
            uint256 highCovRatioFee = _highCovRatioFee(
                fromAsset.cash(),
                fromAsset.liability(),
                uint256(fromAmount),
                actualToAmount,
                poolData.startCovRatio,
                poolData.endCovRatio
            );

            actualToAmount -= highCovRatioFee;
            toTokenFee += highCovRatioFee;
        } else {
            // reverse quote
            uint256 toAssetCash = toAsset.cash();
            uint256 toAssetLiability = toAsset.liability();
            uint256 finalToAssetCovRatio = (toAssetCash + actualToAmount).wdiv(toAssetLiability);
            if (finalToAssetCovRatio <= poolData.startCovRatio) {
                // happy path: no high cov ratio fee is charged
                return (actualToAmount, toTokenFee);
            } else if (toAssetCash.wdiv(toAssetLiability) >= poolData.endCovRatio) {
                // the to-asset exceeds it's cov ratio limit, further swap to increase cov ratio is impossible
                revert CORE_COV_RATIO_LIMIT_EXCEEDED();
            }

            // reverse quote: cov ratio of the to-asset exceed endCovRatio. direct reverse quote is not supported
            // we binary search for a upper bound
            actualToAmount = _findUpperBound(poolData, toAsset, fromAsset, uint256(-fromAmount), scaleFactor);
            (, toTokenFee) = quoteSwapForHighCovRatioPool(
                poolData,
                toAsset,
                fromAsset,
                actualToAmount.toInt256(),
                scaleFactor
            );
        }
    }

    /**
     * @notice Binary search to find the upper bound of `fromAmount` required to swap `fromAsset` to `toAmount` of `toAsset`
     * @dev This function should only used as off-chain view function as it is a gas monster
     */
    function _findUpperBound(
        PoolV4Data storage poolData,
        IAsset fromAsset,
        IAsset toAsset,
        uint256 toAmount,
        uint256 scaleFactor
    ) private view returns (uint256 upperBound) {
        uint8 decimals = fromAsset.underlyingTokenDecimals();
        uint256 toWadFactor = DSMath.toWad(1, decimals);
        // the search value uses the same number of digits as the token
        uint256 high = (uint256(fromAsset.liability()).wmul(poolData.endCovRatio) - fromAsset.cash()).fromWad(decimals);
        uint256 low = 1;

        // verify `high` is a valid upper bound
        uint256 quote;
        (quote, ) = quoteSwapForHighCovRatioPool(
            poolData,
            fromAsset,
            toAsset,
            (high * toWadFactor).toInt256(),
            scaleFactor
        );
        if (quote < toAmount) revert CORE_COV_RATIO_LIMIT_EXCEEDED();

        // Note: we might limit the maximum number of rounds if the request is always rejected by the RPC server
        while (low < high) {
            uint256 mid = (low + high) / 2;
            (quote, ) = quoteSwapForHighCovRatioPool(
                poolData,
                fromAsset,
                toAsset,
                (mid * toWadFactor).toInt256(),
                scaleFactor
            );
            if (quote >= toAmount) {
                high = mid;
            } else {
                low = mid + 1;
            }
        }
        return high * toWadFactor;
    }

    /// @dev reverse quote is not supported
    /// haircut is calculated in the fromToken when swapping tokens for credit
    function quoteSwapTokensForCredit(
        IAsset fromAsset,
        uint256 fromAmount,
        uint256 ampFactor,
        uint256 scaleFactor,
        uint256 haircutRate,
        uint256 startCovRatio,
        uint256 endCovRatio
    ) external view returns (uint256 creditAmount, uint256 fromTokenFee) {
        if (fromAmount == 0) return (0, 0);
        // haircut
        fromTokenFee = fromAmount.wmul(haircutRate);

        // high coverage ratio fee

        uint256 fromCash = fromAsset.cash();
        uint256 fromLiability = fromAsset.liability();
        fromTokenFee += _highCovRatioFee(
            fromCash,
            fromLiability,
            fromAmount,
            fromAmount - fromTokenFee, // calculate haircut in the fromAmount (exclude haircut)
            startCovRatio,
            endCovRatio
        );

        fromAmount -= fromTokenFee;

        if (scaleFactor != WAD) {
            // apply scale factor on from-amounts
            fromCash = (fromCash * scaleFactor) / 1e18;
            fromLiability = (fromLiability * scaleFactor) / 1e18;
            fromAmount = (fromAmount * scaleFactor) / 1e18;
        }

        creditAmount = _swapToCreditQuote(
            fromCash.toInt256(),
            fromLiability.toInt256(),
            fromAmount.toInt256(),
            ampFactor.toInt256()
        );
    }

    /// @dev reverse quote is not supported
    function quoteSwapCreditForTokens(
        uint256 fromAmount,
        IAsset toAsset,
        uint256 ampFactor,
        uint256 scaleFactor,
        uint256 haircutRate
    ) external view returns (uint256 actualToAmount, uint256 toTokenFee) {
        if (fromAmount == 0) return (0, 0);
        uint256 toCash = toAsset.cash();
        uint256 toLiability = toAsset.liability();

        if (scaleFactor != WAD) {
            // apply scale factor on from-amounts
            fromAmount = (fromAmount * scaleFactor) / 1e18;
        }

        uint256 idealToAmount = _swapFromCreditQuote(
            toCash.toInt256(),
            toLiability.toInt256(),
            fromAmount.toInt256(),
            ampFactor.toInt256()
        );
        if (fromAmount > 0 && toCash < idealToAmount) {
            revert CORE_CASH_NOT_ENOUGH();
        }

        // normal quote
        toTokenFee = idealToAmount.wmul(haircutRate);
        actualToAmount = idealToAmount - toTokenFee;
    }

    //#endregion Swap Logic

    //#region Deposit Logic

    /**
     * @notice Deposits asset in Pool
     * @param asset The asset to be deposited
     * @param amount The amount to be deposited
     * @param minimumLiquidity The minimum amount of liquidity to receive
     * @param to The user accountable for deposit, receiving the Wombat assets (lp)
     * @return liquidity Total asset liquidity minted
     */
    function deposit(
        PoolV4Data storage poolData,
        int256 globalEquilCovRatioForDepositWithdrawal,
        IAsset asset,
        uint256 amount,
        uint256 minimumLiquidity,
        address to
    ) external returns (uint256 liquidity) {
        // collect fee before deposit
        _mintFeeIfNeeded(poolData, asset, globalEquilCovRatioForDepositWithdrawal);

        uint256 liabilityToMint;
        (liquidity, liabilityToMint) = _quoteDepositLiquidity(
            asset,
            amount,
            poolData.ampFactor,
            globalEquilCovRatioForDepositWithdrawal
        );

        _checkLiquidity(liquidity);
        _checkAmount(minimumLiquidity, liquidity);

        asset.addCash(amount);
        asset.addLiability(liabilityToMint);
        asset.mint(to, liquidity);
    }

    function quotePotentialDeposit(
        PoolV4Data storage poolData,
        IERC20 token,
        uint256 amount,
        int256 globalEquilCovRatioForDepositWithdrawal
    ) external view returns (uint256 liquidity) {
        IAsset asset = poolData.assets.assetOf(token);
        uint8 decimals = asset.underlyingTokenDecimals();
        (liquidity, ) = _quoteDepositLiquidity(
            asset,
            amount.toWad(decimals),
            poolData.ampFactor,
            globalEquilCovRatioForDepositWithdrawal
        );
    }

    /**
     * This function calculate the exactly amount of liquidity of the deposit. Assumes r* = 1
     */
    function _quoteDepositLiquidity(
        IAsset asset,
        uint256 amount,
        uint256 ampFactor,
        int256 _equilCovRatio
    ) private view returns (uint256 lpTokenToMint, uint256 liabilityToMint) {
        liabilityToMint = _equilCovRatio == WAD_I
            ? _exactDepositLiquidityInEquilImpl(
                amount.toInt256(),
                int256(uint256(asset.cash())),
                int256(uint256(asset.liability())),
                ampFactor.toInt256()
            ).toUint256()
            : _exactDepositLiquidityImpl(
                amount.toInt256(),
                int256(uint256(asset.cash())),
                int256(uint256(asset.liability())),
                ampFactor.toInt256(),
                _equilCovRatio
            ).toUint256();

        // Calculate amount of LP to mint : ( deposit + reward ) * TotalAssetSupply / Liability
        uint256 liability = asset.liability();
        lpTokenToMint = (liability == 0 ? liabilityToMint : (liabilityToMint * asset.totalSupply()) / liability);
    }

    //#endregion Deposit Logic

    //#region Withdrawal Logic

    function withdraw(
        PoolV4Data storage poolData,
        int256 globalEquilCovRatioForDepositWithdrawal,
        IAsset asset,
        uint256 liquidity,
        uint256 minimumAmount
    ) external returns (uint256 amount, uint256 withdrawalHaircut) {
        // collect fee before withdraw
        _mintFeeIfNeeded(poolData, asset, globalEquilCovRatioForDepositWithdrawal);

        // calculate liabilityToBurn and Fee
        uint256 liabilityToBurn;
        (amount, liabilityToBurn, withdrawalHaircut) = _quoteWithdrawAmount(
            asset,
            liquidity,
            poolData.ampFactor,
            globalEquilCovRatioForDepositWithdrawal,
            poolData.withdrawalHaircutRate
        );
        _checkAmount(minimumAmount, amount);

        asset.burn(address(asset), liquidity);
        asset.removeCash(amount + withdrawalHaircut);
        asset.removeLiability(liabilityToBurn);

        // revert if cov ratio < 1% to avoid precision error
        if (asset.liability() > 0 && uint256(asset.cash()).wdiv(asset.liability()) < WAD / 100)
            revert WOMBAT_FORBIDDEN();

        if (withdrawalHaircut > 0) {
            _accumulateFee(poolData, asset, withdrawalHaircut);
        }
    }

    function quotePotentialWithdraw(
        PoolV4Data storage poolData,
        int256 globalEquilCovRatioForDepositWithdrawal,
        IERC20 token,
        uint256 liquidity
    ) external view returns (uint256 amount) {
        _checkLiquidity(liquidity);
        IAsset asset = poolData.assets.assetOf(token);
        (amount, , ) = _quoteWithdrawAmount(
            asset,
            liquidity,
            poolData.ampFactor,
            globalEquilCovRatioForDepositWithdrawal,
            poolData.withdrawalHaircutRate
        );

        uint8 decimals = asset.underlyingTokenDecimals();
        amount = amount.fromWad(decimals);
    }

    function quotePotentialWithdrawFromOtherAsset(
        PoolV4Data storage poolData,
        IERC20 fromToken,
        IERC20 toToken,
        uint256 liquidity,
        uint256 scaleFactor,
        int256 globalEquilCovRatioForDepositWithdrawal
    ) external view returns (uint256 finalAmount, uint256 withdrewAmount) {
        _checkLiquidity(liquidity);
        _checkSameAddress(address(fromToken), address(toToken));

        IAsset fromAsset = poolData.assets.assetOf(fromToken);
        IAsset toAsset = poolData.assets.assetOf(toToken);
        (finalAmount, withdrewAmount) = _quoteWithdrawAmountFromOtherAsset(
            fromAsset,
            toAsset,
            liquidity,
            poolData.ampFactor,
            scaleFactor,
            poolData.haircutRate,
            poolData.startCovRatio, // this value is 0 for base pool
            poolData.endCovRatio, // this value is 0 for base pool
            globalEquilCovRatioForDepositWithdrawal,
            poolData.withdrawalHaircutRate
        );

        withdrewAmount = withdrewAmount.fromWad(fromAsset.underlyingTokenDecimals());
        finalAmount = finalAmount.fromWad(toAsset.underlyingTokenDecimals());
    }

    function _quoteWithdrawAmountFromOtherAsset(
        IAsset fromAsset,
        IAsset toAsset,
        uint256 liquidity,
        uint256 ampFactor,
        uint256 scaleFactor,
        uint256 haircutRate,
        uint256 startCovRatio,
        uint256 endCovRatio,
        int256 _equilCovRatio,
        uint256 withdrawalHaircutRate
    ) private view returns (uint256 finalAmount, uint256 withdrewAmount) {
        // quote withdraw
        uint256 withdrawalHaircut;
        uint256 liabilityToBurn;
        (withdrewAmount, liabilityToBurn, withdrawalHaircut) = _quoteWithdrawAmount(
            fromAsset,
            liquidity,
            ampFactor,
            _equilCovRatio,
            withdrawalHaircutRate
        );

        // quote swap
        uint256 fromCash = fromAsset.cash() - withdrewAmount - withdrawalHaircut;
        uint256 fromLiability = fromAsset.liability() - liabilityToBurn;

        if (scaleFactor != WAD) {
            // apply scale factor on from-amounts
            fromCash = (fromCash * scaleFactor) / 1e18;
            fromLiability = (fromLiability * scaleFactor) / 1e18;
            withdrewAmount = (withdrewAmount * scaleFactor) / 1e18;
        }

        uint256 idealToAmount = _swapQuoteFunc(
            fromCash.toInt256(),
            int256(uint256(toAsset.cash())),
            fromLiability.toInt256(),
            int256(uint256(toAsset.liability())),
            withdrewAmount.toInt256(),
            ampFactor.toInt256()
        );

        // remove haircut
        finalAmount = idealToAmount - idealToAmount.wmul(haircutRate);

        // `endCovRatio` will be 0 for base pool
        if (endCovRatio > 0) {
            // charge high cov ratio fee
            uint256 fee = _highCovRatioFee(
                fromCash,
                fromLiability,
                withdrewAmount,
                finalAmount,
                startCovRatio,
                endCovRatio
            );

            finalAmount -= fee;
        }
    }

    /**
     * @notice Calculates fee and liability to burn in case of withdrawal
     * @param asset The asset willing to be withdrawn
     * @param liquidity The liquidity willing to be withdrawn
     * @param _equilCovRatio global equilibrium coverage ratio
     * @param withdrawalHaircutRate withdraw haircut rate
     * @return amount Total amount to be withdrawn from Pool
     * @return liabilityToBurn Total liability to be burned by Pool
     * @return withdrawalHaircut Total withdrawal haircut
     */
    function _quoteWithdrawAmount(
        IAsset asset,
        uint256 liquidity,
        uint256 ampFactor,
        int256 _equilCovRatio,
        uint256 withdrawalHaircutRate
    ) private view returns (uint256 amount, uint256 liabilityToBurn, uint256 withdrawalHaircut) {
        liabilityToBurn = (asset.liability() * liquidity) / asset.totalSupply();
        if (liabilityToBurn == 0) revert CORE_ZERO_LIQUIDITY();

        amount = _equilCovRatio == WAD_I
            ? _withdrawalAmountInEquilImpl(
                -liabilityToBurn.toInt256(),
                int256(uint256(asset.cash())),
                int256(uint256(asset.liability())),
                ampFactor.toInt256()
            ).toUint256()
            : _withdrawalAmountImpl(
                -liabilityToBurn.toInt256(),
                int256(uint256(asset.cash())),
                int256(uint256(asset.liability())),
                ampFactor.toInt256(),
                _equilCovRatio
            ).toUint256();

        // charge withdrawal haircut
        if (withdrawalHaircutRate > 0) {
            withdrawalHaircut = amount.wmul(withdrawalHaircutRate);
            amount -= withdrawalHaircut;
        }
    }

    //#endregion Withdrawal Logic

    //#region Fee Logic

    function _accumulateFee(PoolV4Data storage poolData, IAsset asset, uint256 amount) private {
        poolData.feeAndReserve[asset].feeCollected += amount.to128();
    }

    function mintAllFees(PoolV4Data storage poolData, int256 globalEquilCovRatioForDepositWithdrawal) external {
        for (uint256 i; i < poolData.assets.count(); ++i) {
            IAsset asset = poolData.assets.getAssetAtIndex(i);
            mintFee(poolData, asset, globalEquilCovRatioForDepositWithdrawal);
        }
    }

    function _mintFeeIfNeeded(
        PoolV4Data storage poolData,
        IAsset asset,
        int256 globalEquilCovRatioForDepositWithdrawal
    ) private {
        uint256 feeCollected = poolData.feeAndReserve[asset].feeCollected;
        if (feeCollected == 0 || feeCollected < poolData.mintFeeThreshold) {
            return;
        } else {
            mintFee(poolData, asset, globalEquilCovRatioForDepositWithdrawal);
        }
    }

    /**
     * @dev return balance in WAD
     */
    function tipBucketBalance(PoolV4Data storage poolData, IERC20 token) external view returns (uint256 balance) {
        IAsset asset = poolData.assets.assetOf(token);
        return
            asset.underlyingTokenBalance().toWad(asset.underlyingTokenDecimals()) -
            asset.cash() -
            poolData.feeAndReserve[asset].feeCollected;
    }

    /**
     * @notice Private function to send fee collected to the fee beneficiary
     * @param asset The address of the asset to collect fee
     */
    function mintFee(
        PoolV4Data storage poolData,
        IAsset asset,
        int256 globalEquilCovRatioForDepositWithdrawal
    ) public returns (uint256 feeCollected) {
        feeCollected = poolData.feeAndReserve[asset].feeCollected;
        if (feeCollected == 0) {
            // early return
            return 0;
        }
        {
            // dividend to veWOM
            uint256 dividend = feeCollected.wmul(WAD - poolData.lpDividendRatio - poolData.retentionRatio);

            if (dividend > 0) {
                asset.transferUnderlyingToken(poolData.feeTo, dividend.fromWad(asset.underlyingTokenDecimals()));
            }
        }
        {
            // dividend to LP
            uint256 lpDividend = feeCollected.wmul(poolData.lpDividendRatio);
            if (lpDividend > 0) {
                // exact deposit to maintain r* = 1
                // increase the value of the LP token, i.e. assetsPerShare
                (, uint256 liabilityToMint) = _quoteDepositLiquidity(
                    asset,
                    lpDividend,
                    poolData.ampFactor,
                    globalEquilCovRatioForDepositWithdrawal
                );
                asset.addLiability(liabilityToMint);
                asset.addCash(lpDividend);
            }
        }
        // remainings are sent to the tipbucket

        poolData.feeAndReserve[asset].feeCollected = 0;
    }

    function _highCovRatioFee(
        uint256 fromAssetCash,
        uint256 fromAssetLiability,
        uint256 fromAmount,
        uint256 quotedToAmount,
        uint256 startCovRatio,
        uint256 endCovRatio
    ) private pure returns (uint256 fee) {
        uint256 finalFromAssetCovRatio = (fromAssetCash + fromAmount).wdiv(fromAssetLiability);

        if (finalFromAssetCovRatio > startCovRatio) {
            // charge high cov ratio fee
            uint256 feeRatio = _highCovRatioFee(
                fromAssetCash.wdiv(fromAssetLiability),
                finalFromAssetCovRatio,
                startCovRatio,
                endCovRatio
            );

            if (feeRatio > WAD) revert CORE_INVALID_HIGH_COV_RATIO_FEE();
            fee = feeRatio.wmul(quotedToAmount);
        }
    }

    //#endregion Fee Logic

    //#region Pure calculating functions

    /**
     * @notice Core Wombat stableswap equation
     * @dev This function always returns >= 0
     * @param Ax asset of token x
     * @param Ay asset of token y
     * @param Lx liability of token x
     * @param Ly liability of token y
     * @param Dx delta x, i.e. token x amount inputted
     * @param A amplification factor
     * @return quote The quote for amount of token y swapped for token x amount inputted
     */
    function _swapQuoteFunc(
        int256 Ax,
        int256 Ay,
        int256 Lx,
        int256 Ly,
        int256 Dx,
        int256 A
    ) private pure returns (uint256 quote) {
        if (Lx == 0 || Ly == 0) {
            // in case div of 0
            revert CORE_UNDERFLOW();
        }
        int256 D = Ax + Ay - A.wmul((Lx * Lx) / Ax + (Ly * Ly) / Ay); // flattened _invariantFunc
        int256 rx_ = (Ax + Dx).wdiv(Lx);
        int256 b = (Lx * (rx_ - A.wdiv(rx_))) / Ly - D.wdiv(Ly); // flattened _coefficientFunc
        int256 ry_ = _solveQuad(b, A);
        int256 Dy = Ly.wmul(ry_) - Ay;
        return Dy.abs();
    }

    /**
     * @dev Calculate the withdrawal amount for any r*
     */
    function _withdrawalAmountImpl(
        int256 delta_i,
        int256 A_i,
        int256 L_i,
        int256 A,
        int256 _equilCovRatio
    ) private pure returns (int256 amount) {
        int256 L_i_ = L_i + delta_i;
        int256 r_i = A_i.wdiv(L_i);
        int256 delta_D = delta_i.wmul(_equilCovRatio) - (delta_i * A) / _equilCovRatio; // The only line that is different
        int256 b = -(L_i.wmul(r_i - A.wdiv(r_i)) + delta_D);
        int256 c = A.wmul(L_i_.wmul(L_i_));
        int256 A_i_ = _solveQuad(b, c);
        amount = A_i - A_i_;
    }

    /**
     * @dev should be used only when r* = 1
     */
    function _withdrawalAmountInEquilImpl(
        int256 delta_i,
        int256 A_i,
        int256 L_i,
        int256 A
    ) private pure returns (int256 amount) {
        int256 L_i_ = L_i + delta_i;
        int256 r_i = A_i.wdiv(L_i);

        int256 rho = L_i.wmul(r_i - A.wdiv(r_i));
        int256 beta = (rho + delta_i.wmul(WAD_I - A)) / 2;
        int256 A_i_ = beta + (beta * beta + A.wmul(L_i_ * L_i_)).sqrt(beta);
        // equilvalent to:
        // int256 delta_D = delta_i.wmul(WAD_I - A);
        // int256 b = -(L_i.wmul(r_i - A.wdiv(r_i)) + delta_D);
        // int256 c = A.wmul(L_i_.wmul(L_i_));
        // int256 A_i_ = _solveQuad(b, c);

        amount = A_i - A_i_;
    }

    /**
     * @notice return the deposit reward in token amount when target liquidity (LP amount) is known
     */
    function _exactDepositLiquidityImpl(
        int256 D_i,
        int256 A_i,
        int256 L_i,
        int256 A,
        int256 _equilCovRatio
    ) private pure returns (int256 liquidity) {
        if (L_i == 0) {
            // if this is a deposit, there is no reward/fee
            // if this is a withdrawal, it should have been reverted
            return D_i;
        }
        if (A_i + D_i < 0) {
            // impossible
            revert CORE_UNDERFLOW();
        }

        int256 r_i = A_i.wdiv(L_i);
        int256 k = D_i + A_i;
        int256 b = k.wmul(_equilCovRatio) - (k * A) / _equilCovRatio + 2 * A.wmul(L_i); // The only line that is different
        int256 c = k.wmul(A_i - (A * L_i) / r_i) - k.wmul(k) + A.wmul(L_i).wmul(L_i);
        int256 l = b * b - 4 * A * c;
        return (-b + l.sqrt(b)).wdiv(A) / 2;
    }

    /**
     * @notice return the deposit reward in token amount when target liquidity (LP amount) is known
     */
    function _exactDepositLiquidityInEquilImpl(
        int256 D_i,
        int256 A_i,
        int256 L_i,
        int256 A
    ) private pure returns (int256 liquidity) {
        if (L_i == 0) {
            // if this is a deposit, there is no reward/fee
            // if this is a withdrawal, it should have been reverted
            return D_i;
        }
        if (A_i + D_i < 0) {
            // impossible
            revert CORE_UNDERFLOW();
        }

        int256 r_i = A_i.wdiv(L_i);
        int256 k = D_i + A_i;
        int256 b = k.wmul(WAD_I - A) + 2 * A.wmul(L_i);
        int256 c = k.wmul(A_i - (A * L_i) / r_i) - k.wmul(k) + A.wmul(L_i).wmul(L_i);
        int256 l = b * b - 4 * A * c;
        return (-b + l.sqrt(b)).wdiv(A) / 2;
    }

    /**
     * @notice quote swapping from tokens for credit
     * @dev This function always returns >= 0
     */
    function _swapToCreditQuote(int256 Ax, int256 Lx, int256 Dx, int256 A) private pure returns (uint256 quote) {
        int256 rx = Ax.wdiv(Lx);
        int256 rx_ = (Ax + Dx).wdiv(Lx);
        int256 x = rx_ - A.wdiv(rx_);
        int256 y = rx - A.wdiv(rx);

        // adjsut credit by 1 / (1 + A)
        return ((Lx * (x - y)) / (WAD_I + A)).abs();
    }

    /**
     * @notice quote swapping from credit for tokens
     * @dev This function always returns >= 0
     */
    function _swapFromCreditQuote(
        int256 Ax,
        int256 Lx,
        int256 delta_credit,
        int256 A
    ) private pure returns (uint256 quote) {
        int256 rx = Ax.wdiv(Lx);
        // adjsut credit by 1 + A
        int256 b = (delta_credit * (WAD_I + A)) / Lx - rx + A.wdiv(rx); // flattened _coefficientFunc
        int256 rx_ = _solveQuad(b, A);
        int256 Dx = Ax - Lx.wmul(rx_);

        return Dx.abs();
    }

    //#endregion Pure calculating functions

    //#region Math functions

    /**
     * @notice Solve quadratic equation
     * @dev This function always returns >= 0
     * @param b quadratic equation b coefficient
     * @param c quadratic equation c coefficient
     * @return x
     */
    function _solveQuad(int256 b, int256 c) private pure returns (int256) {
        return (((b * b) + (c * 4 * WAD_I)).sqrt(b) - b) / 2;
    }

    /**
     * @notice Equation to get invariant constant between token x and token y
     * @dev This function always returns >= 0
     * @param Lx liability of token x
     * @param rx cov ratio of token x
     * @param Ly liability of token x
     * @param ry cov ratio of token y
     * @param A amplification factor
     * @return The invariant constant between token x and token y ("D")
     */
    function _invariantFunc(int256 Lx, int256 rx, int256 Ly, int256 ry, int256 A) private pure returns (int256) {
        int256 a = Lx.wmul(rx) + Ly.wmul(ry);
        int256 b = A.wmul(Lx.wdiv(rx) + Ly.wdiv(ry));
        return a - b;
    }

    /**
     * @notice Equation to get quadratic equation b coefficient
     * @dev This function can return >= 0 or <= 0
     * @param Lx liability of token x
     * @param Ly liability of token y
     * @param rx_ new asset coverage ratio of token x
     * @param D invariant constant
     * @param A amplification factor
     * @return The quadratic equation b coefficient ("b")
     */
    function _coefficientFunc(int256 Lx, int256 Ly, int256 rx_, int256 D, int256 A) private pure returns (int256) {
        return (Lx * (rx_ - A.wdiv(rx_))) / Ly - D.wdiv(Ly);
    }

    function _targetedCovRatio(
        int256 SL,
        int256 delta_i,
        int256 A_i,
        int256 L_i,
        int256 D,
        int256 A
    ) private pure returns (int256 r_i_) {
        int256 r_i = A_i.wdiv(L_i);
        int256 er = _equilCovRatio(D, SL, A);
        int256 er_ = _newEquilCovRatio(er, SL, delta_i);
        int256 D_ = _newInvariantFunc(er_, A, SL, delta_i);

        // Summation of k∈T\{i} is D - L_i.wmul(r_i - A.wdiv(r_i))
        int256 b_ = (D - A_i + (L_i * A) / r_i - D_).wdiv(L_i + delta_i);
        r_i_ = _solveQuad(b_, A);
    }

    function _newEquilCovRatio(int256 er, int256 SL, int256 delta_i) private pure returns (int256 er_) {
        er_ = (delta_i + SL.wmul(er)).wdiv(delta_i + SL);
    }

    function _newInvariantFunc(int256 er_, int256 A, int256 SL, int256 delta_i) private pure returns (int256 D_) {
        D_ = (SL + delta_i).wmul(er_ - A.wdiv(er_));
    }

    /**
     * @notice Calculate the high cov ratio fee in the to-asset in a swap.
     * @dev When cov ratio is in the range [startCovRatio, endCovRatio], the marginal cov ratio is
     * (r - startCovRatio) / (endCovRatio - startCovRatio). Here we approximate the high cov ratio cut
     * by calculating the "average" fee.
     * Note: `finalCovRatio` should be greater than `initCovRatio`
     */
    function _highCovRatioFee(
        uint256 initCovRatio,
        uint256 finalCovRatio,
        uint256 startCovRatio,
        uint256 endCovRatio
    ) private pure returns (uint256 fee) {
        if (finalCovRatio > endCovRatio) {
            // invalid swap
            revert CORE_COV_RATIO_LIMIT_EXCEEDED();
        } else if (finalCovRatio <= startCovRatio || finalCovRatio <= initCovRatio) {
            return 0;
        }

        // 1. Calculate the area of fee(r) = (r - startCovRatio) / (endCovRatio - startCovRatio)
        // when r increase from initCovRatio to finalCovRatio
        // 2. Then multiply it by (endCovRatio - startCovRatio) / (finalCovRatio - initCovRatio)
        // to get the average fee over the range
        uint256 a = initCovRatio <= startCovRatio ? 0 : (initCovRatio - startCovRatio) * (initCovRatio - startCovRatio);
        uint256 b = (finalCovRatio - startCovRatio) * (finalCovRatio - startCovRatio);
        fee = ((b - a) / (finalCovRatio - initCovRatio) / 2).wdiv(endCovRatio - startCovRatio);
    }

    function calculateProposedGlobalEquilCovRatio(
        uint256[] memory newCashValues,
        uint256[] memory liabilities,
        uint256[] memory proposedScales,
        uint256 ampFactor
    ) internal pure returns (uint256 proposedGlobalEquilCovRatio) {
        (int256 invariant, int256 SL) = _globalInvariantFunc(newCashValues, liabilities, proposedScales, ampFactor);
        proposedGlobalEquilCovRatio = _equilCovRatio(invariant, SL, ampFactor.toInt256()).toUint256();
    }

    function _equilCovRatio(int256 D, int256 SL, int256 A) private pure returns (int256 er) {
        int256 b = -(D.wdiv(SL));
        er = _solveQuad(b, A);
    }

    //#endregion Math functions

    //#region r*
    function globalEquilCovRatioForStablePool(
        PoolV4Data storage poolData
    ) external view returns (int256 equilCovRatio_, int256 invariant) {
        uint256 assetCount = poolData.assets.count();

        uint256[] memory cashes = new uint256[](assetCount);
        uint256[] memory liabilities = new uint256[](assetCount);
        uint256[] memory priceScales = new uint256[](assetCount);

        for (uint256 i; i < assetCount; ++i) {
            IAsset asset = poolData.assets.getAssetAtIndex(i);

            cashes[i] = asset.cash();
            liabilities[i] = asset.liability();
            priceScales[i] = WAD;
        }

        int256 SL;
        uint256 A = poolData.ampFactor;
        (invariant, SL) = _globalInvariantFunc(cashes, liabilities, priceScales, poolData.ampFactor);
        equilCovRatio_ = _equilCovRatio(invariant, SL, A.toInt256());
    }

    function globalEquilCovRatioForDynamicPool(
        PoolV4Data storage poolData
    ) external view returns (int256 equilCovRatio_, int256 invariant) {
        uint256 assetCount = poolData.assets.count();

        uint256[] memory cashes = new uint256[](assetCount);
        uint256[] memory liabilities = new uint256[](assetCount);
        uint256[] memory priceScales = new uint256[](assetCount);

        for (uint256 i; i < assetCount; ++i) {
            IAsset asset = poolData.assets.getAssetAtIndex(i);

            cashes[i] = asset.cash();
            liabilities[i] = asset.liability();
            priceScales[i] = IRelativePriceProvider(address(asset)).getRelativePrice();
        }

        int256 SL;
        uint256 A = poolData.ampFactor;
        (invariant, SL) = _globalInvariantFunc(cashes, liabilities, priceScales, poolData.ampFactor);
        equilCovRatio_ = _equilCovRatio(invariant, SL, A.toInt256());
    }

    function _globalInvariantFunc(
        uint256[] memory cashes,
        uint256[] memory liabilities,
        uint256[] memory priceScales,
        uint256 ampFactor
    ) private pure returns (int256 D, int256 SL) {
        int256 A = ampFactor.toInt256();
        uint256 assetCount = cashes.length;

        for (uint256 i; i < assetCount; ++i) {
            // overflow is unrealistic
            int256 A_i = int256(cashes[i]);
            int256 L_i = int256(liabilities[i]);
            int256 P_i = priceScales[i].toInt256();

            // Assume when L_i == 0, A_i always == 0
            if (L_i == 0) {
                // avoid division of 0
                continue;
            }

            int256 r_i = A_i.wdiv(L_i);
            SL += P_i.wmul(L_i);
            D += P_i.wmul(L_i).wmul(r_i - A.wdiv(r_i));
        }
    }

    //#endregion r*
}
