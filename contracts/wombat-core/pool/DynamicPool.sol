// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.14;

import '../libraries/DSMath.sol';
import '../interfaces/IRelativePriceProvider.sol';
import './Pool.sol';

/**
 * @title Dynamic Pool
 * @notice Manages deposits, withdrawals and swaps. Holds a mapping of assets and parameters.
 * @dev Supports dynamic assets. Assume r* to be close to 1.
 * Be aware that r* changes when the relative price of the asset updates
 */
contract DynamicPool is Pool {
    using DSMath for uint256;
    using SignedSafeMath for int256;

    /**
     * @notice multiply / divide the cash, liability and amount of a swap by relative price
     * Invariant: D = Sum of P_i * L_i * (r_i - A / r_i)
     */
    function _scaleQuoteAmount(
        IAsset fromAsset,
        IAsset toAsset,
        uint256 fromCash,
        uint256 fromLiability,
        int256 fromAmount
    )
        internal
        view
        returns (
            uint256,
            uint256,
            int256
        )
    {
        uint256 fromAssetRelativePrice = IRelativePriceProvider(address(fromAsset)).getRelativePrice();
        if (fromAssetRelativePrice != WAD) {
            fromCash = (fromCash * fromAssetRelativePrice) / 1e18;
            fromLiability = (fromLiability * fromAssetRelativePrice) / 1e18;
            fromAmount = (fromAmount * int256(fromAssetRelativePrice)) / 1e18;
        }

        // theoretically we should multiply toCash, toLiability and idealToAmount by toAssetRelativePrice
        // however we simplify the calculation by dividing "from amounts" by toAssetRelativePrice
        uint256 toAssetRelativePrice = IRelativePriceProvider(address(toAsset)).getRelativePrice();
        if (toAssetRelativePrice != WAD) {
            fromCash = (fromCash * 1e18) / toAssetRelativePrice;
            fromLiability = (fromLiability * 1e18) / toAssetRelativePrice;
            fromAmount = (fromAmount * 1e18) / int256(toAssetRelativePrice);
        }

        return (fromCash, fromLiability, fromAmount);
    }

    function _quoteFrom(
        IAsset fromAsset,
        IAsset toAsset,
        int256 fromAmount
    ) internal view override returns (uint256 actualToAmount, uint256 haircut) {
        // exact output swap quote should count haircut before swap
        if (fromAmount < 0) {
            fromAmount = fromAmount.wdiv(WAD_I - int256(haircutRate));
        }

        uint256 fromCash = uint256(fromAsset.cash());
        uint256 fromLiability = uint256(fromAsset.liability());
        uint256 toCash = uint256(toAsset.cash());

        (fromCash, fromLiability, fromAmount) = _scaleQuoteAmount(
            fromAsset,
            toAsset,
            fromCash,
            fromLiability,
            fromAmount
        );

        uint256 idealToAmount;
        idealToAmount = _swapQuoteFunc(
            int256(fromCash),
            int256(toCash),
            int256(fromLiability),
            int256(uint256(toAsset.liability())),
            fromAmount,
            int256(ampFactor)
        );
        if ((fromAmount > 0 && toCash < idealToAmount) || (fromAmount < 0 && fromAsset.cash() < uint256(-fromAmount))) {
            revert WOMBAT_CASH_NOT_ENOUGH();
        }

        if (fromAmount > 0) {
            // normal quote
            haircut = idealToAmount.wmul(haircutRate);
            actualToAmount = idealToAmount - haircut;
        } else {
            // exact output swap quote count haircut in the fromAmount
            actualToAmount = idealToAmount;
            haircut = (uint256(-fromAmount)).wmul(haircutRate);
        }
    }

    function _quotePotentialWithdrawFromOtherAsset(
        address fromToken,
        address toToken,
        uint256 liquidity
    ) internal view override returns (uint256 amount, uint256 withdrewAmount) {
        _checkLiquidity(liquidity);
        _checkSameAddress(fromToken, toToken);

        IAsset fromAsset = _assetOf(fromToken);
        IAsset toAsset = _assetOf(toToken);

        // quote withdraw
        (withdrewAmount, , ) = _withdrawFrom(fromAsset, liquidity);

        // quote swap
        uint256 fromCash = uint256(fromAsset.cash()) - withdrewAmount;
        uint256 fromLiability = uint256(fromAsset.liability()) - liquidity;

        int256 withdrewAmount_i;
        (fromCash, fromLiability, withdrewAmount_i) = _scaleQuoteAmount(
            fromAsset,
            toAsset,
            fromCash,
            fromLiability,
            int256(withdrewAmount)
        );
        withdrewAmount = uint256(withdrewAmount_i);

        amount = _swapQuoteFunc(
            int256(fromCash),
            int256(uint256(toAsset.cash())),
            int256(fromLiability),
            int256(uint256(toAsset.liability())),
            int256(withdrewAmount),
            int256(ampFactor)
        );
        amount = amount - amount.wmul(haircutRate);
        amount = amount.fromWad(toAsset.underlyingTokenDecimals());
    }

    /**
     * @dev Invariant: D = Sum of P_i * L_i * (r_i - A / r_i)
     */
    function _globalInvariantFunc() internal view override returns (int256 D, int256 SL) {
        int256 A = int256(ampFactor);

        for (uint256 i = 0; i < _sizeOfAssetList(); i++) {
            IAsset asset = _getAsset(_getKeyAtIndex(i));

            // overflow is unrealistic
            int256 A_i = int256(uint256(asset.cash()));
            int256 L_i = int256(uint256(asset.liability()));
            int256 P_i = int256(uint256(IRelativePriceProvider(address(asset)).getRelativePrice()));

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
}
