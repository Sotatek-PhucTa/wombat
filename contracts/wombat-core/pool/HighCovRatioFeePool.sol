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

    function _quoteFrom(
        IAsset fromAsset,
        IAsset toAsset,
        int256 fromAmount
    ) internal view override returns (uint256 actualToAmount, uint256 haircut) {
        (actualToAmount, haircut) = super._quoteFrom(fromAsset, toAsset, fromAmount);

        if (fromAmount >= 0) {
            uint256 finalFromAssetCovRatio = (fromAsset.cash() + uint256(fromAmount)).wdiv(fromAsset.liability());
            if (finalFromAssetCovRatio >= endCovRatio) {
                // invalid swap
                revert WOMBAT_COV_RATIO_LIMIT_EXCEEDED();
            } else if (finalFromAssetCovRatio > startCovRatio) {
                // charge high cov ratio fee
                uint256 highCovRatioFee = (finalFromAssetCovRatio - startCovRatio)
                    .wdiv(endCovRatio - startCovRatio)
                    .wmul(actualToAmount);

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
