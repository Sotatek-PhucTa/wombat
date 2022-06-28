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

    function setCovRatioFeeParam(uint128 startCovRatio_, uint128 endCovRatio_) external onlyOwner {
        if (startCovRatio_ < 1e18 || startCovRatio_ > endCovRatio_) revert WOMBAT_INVALID_VALUE();

        startCovRatio = startCovRatio_;
        endCovRatio = endCovRatio_;
    }

    /**
     * Assume finalCovRatio in range (startCovRatio, endCovRatio)
     */
    function _highCovRatioFee(uint256 initCovRatio, uint256 finalCovRatio) internal view returns (uint256 fee) {
        uint256 a = initCovRatio <= startCovRatio
            ? 0
            : ((initCovRatio - startCovRatio)
                .wmul(initCovRatio - startCovRatio)
                .wdiv(finalCovRatio - initCovRatio)
                .wdiv(endCovRatio - startCovRatio) / 2);
        uint256 b = (finalCovRatio - startCovRatio)
            .wmul(finalCovRatio - startCovRatio)
            .wdiv(finalCovRatio - initCovRatio)
            .wdiv(endCovRatio - startCovRatio) / 2;

        return b - a;
    }

    function _quoteFrom(
        IAsset fromAsset,
        IAsset toAsset,
        int256 fromAmount
    ) internal view override returns (uint256 actualToAmount, uint256 haircut) {
        (actualToAmount, haircut) = super._quoteFrom(fromAsset, toAsset, fromAmount);

        if (fromAmount >= 0) {
            uint256 fromAssetCash = fromAsset.cash();
            uint256 fromAssetLiability = fromAsset.liability();
            uint256 finalFromAssetCovRatio = (fromAssetCash + uint256(fromAmount)).wdiv(fromAssetLiability);

            if (finalFromAssetCovRatio >= endCovRatio) {
                // invalid swap
                revert WOMBAT_COV_RATIO_LIMIT_EXCEEDED();
            } else if (finalFromAssetCovRatio > startCovRatio) {
                // charge high cov ratio fee
                uint256 highCovRatioFee = _highCovRatioFee(
                    fromAssetCash.wdiv(fromAssetLiability),
                    finalFromAssetCovRatio
                ).wmul(actualToAmount);

                actualToAmount -= highCovRatioFee;
                haircut += highCovRatioFee;
            }
        } else {
            uint256 finalToAssetCovRatio = (toAsset.cash() + uint256(actualToAmount)).wdiv(fromAsset.liability());
            if (finalToAssetCovRatio > startCovRatio) {
                // reverse quote: the to asset exceed cov ratio. reverse quote is not suppored
                revert WOMBAT_DIRECT_REVERSE_QUOTE_NOT_SUPPORTED();
            }
        }
    }
}
