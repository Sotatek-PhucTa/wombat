// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import '../libraries/DSMath.sol';
import '../interfaces/IRelativePriceProvider.sol';
import './HighCovRatioFeePoolV4.sol';

/**
 * @title Dynamic Pool
 * @notice Manages deposits, withdrawals and swaps. Holds a mapping of assets and parameters.
 * @dev Supports dynamic assets. Assume r* to be close to 1.
 * Be aware that r* changes when the relative price of the asset updates
 * Change log:
 * - V2: add `gap` to prevent storage collision for future upgrades
 * - V2: Inherite from `HighCovRatioFeePoolV2` instead of `Pool`
 */
contract DynamicPoolV4 is HighCovRatioFeePoolV4 {
    /**
     * @notice multiply / divide the cash, liability and amount of a swap by relative price
     * Invariant: D = Sum of P_i * L_i * (r_i - A / r_i)
     */
    function _quoteFactor(IAsset fromAsset, IAsset toAsset) internal view override returns (uint256) {
        uint256 fromAssetRelativePrice = IRelativePriceProvider(address(fromAsset)).getRelativePrice();
        // theoretically we should multiply toCash, toLiability and idealToAmount by toAssetRelativePrice
        // however we simplify the calculation by dividing "from amounts" by toAssetRelativePrice
        uint256 toAssetRelativePrice = IRelativePriceProvider(address(toAsset)).getRelativePrice();

        return (1e18 * fromAssetRelativePrice) / toAssetRelativePrice;
    }

    function globalEquilCovRatio() public view override returns (int256 equilCovRatio, int256 invariant) {
        return CoreV4.globalEquilCovRatioForDynamicPool(poolData);
    }
}
