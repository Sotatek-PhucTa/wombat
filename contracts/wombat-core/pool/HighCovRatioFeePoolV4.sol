// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import '../libraries/DSMath.sol';
import './PoolV4.sol';

/**
 * @title High Coverage Ratio Fee Pool
 * @dev Pool with high cov ratio fee protection
 * Change log:
 * - V2: Add `gap` to prevent storage collision for future upgrades
 * - V3: Contract size compression
 */
contract HighCovRatioFeePoolV4 is PoolV4 {
    function initialize(uint256 ampFactor_, uint256 haircutRate_) public virtual override {
        super.initialize(ampFactor_, haircutRate_);
        poolData.startCovRatio = 15e17;
        poolData.endCovRatio = 18e17;
    }

    function setCovRatioFeeParam(uint128 startCovRatio_, uint128 endCovRatio_) external onlyOwner {
        if (startCovRatio_ < 1e18 || startCovRatio_ > endCovRatio_) revert WOMBAT_INVALID_VALUE();

        poolData.startCovRatio = startCovRatio_;
        poolData.endCovRatio = endCovRatio_;
    }

    /**
     * @dev Exact output swap (fromAmount < 0) should be only used by off-chain quoting function as it is a gas monster
     */
    function _quoteFrom(
        IAsset fromAsset,
        IAsset toAsset,
        int256 fromAmount
    ) internal view override returns (uint256 actualToAmount, uint256 toTokenFee) {
        uint256 scaleFactor = _quoteFactor(fromAsset, toAsset);
        return CoreV4.quoteSwapForHighCovRatioPool(poolData, fromAsset, toAsset, fromAmount, scaleFactor);
    }

    /* Getters */

    function startCovRatio() external view returns (uint128) {
        return poolData.startCovRatio;
    }

    function endCovRatio() external view returns (uint128) {
        return poolData.endCovRatio;
    }
}
