// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.5;

import '../libraries/DSMath.sol';
import './Pool.sol';

contract HighCovRatioFeePool is Pool {
    using DSMath for uint256;

    uint128 startCovRatio = 15e17; // 1.5
    uint128 endCovRatio = 18e17; // 1.8

    error WOMBAT_COV_RATIO_LIMIT_EXCEEDED();
    error WOMBAT_DIRECT_REVERSE_QUOTE_NOT_SUPPORTED();

    /**
     * @notice charge high cov ratio fee if the final cov ratio of from asset is greater than the startCovRatio
     */
    function _swap(
        IAsset fromAsset,
        IAsset toAsset,
        uint256 fromAmount,
        uint256 minimumToAmount
    ) internal override returns (uint256 actualToAmount, uint256 haircut) {
        (actualToAmount, haircut) = _quoteFrom(fromAsset, toAsset, int256(fromAmount));

        /************************ diff begin ************************/
        uint256 finalFromAssetCovRatio = (fromAsset.cash() + fromAmount).wdiv(fromAsset.liability());
        if (finalFromAssetCovRatio >= endCovRatio) {
            // invalid swap
            revert WOMBAT_COV_RATIO_LIMIT_EXCEEDED();
        } else if (finalFromAssetCovRatio > startCovRatio) {
            // charge high cov ratio fee
            uint256 fee = (finalFromAssetCovRatio - startCovRatio).wdiv(endCovRatio - startCovRatio).wmul(
                actualToAmount
            );

            actualToAmount -= fee;
            haircut += fee;
        }
        /************************ diff end ************************/

        _checkAmount(minimumToAmount, actualToAmount);

        _feeCollected[toAsset] += haircut;

        fromAsset.addCash(fromAmount);

        // haircut is removed from cash to maintain r* = 1. It is distributed during _mintFee()
        toAsset.removeCash(actualToAmount + haircut);

        // revert if cov ratio < 1% to avoid precision error
        if (uint256(toAsset.cash()).wdiv(toAsset.liability()) < WAD / 100) revert WOMBAT_FORBIDDEN();
    }

    function quotePotentialSwap(
        address fromToken,
        address toToken,
        int256 fromAmount
    ) public view virtual override returns (uint256 potentialOutcome, uint256 haircut) {
        if (fromAmount < 0) revert WOMBAT_DIRECT_REVERSE_QUOTE_NOT_SUPPORTED();
        return super.quotePotentialSwap(fromToken, toToken, fromAmount);
    }
}
