// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.5;

import '../pool/VolatilePool.sol';

contract MockVolatilePool is VolatilePool {
    function getNormalizedAdjustmentStep(uint256 norm) external view returns (uint256) {
        return RepegHelper._getNormalizedAdjustmentStep(repegData, norm);
    }

    function getCashValuesWithReserve() external view returns (uint256[] memory cashValuesWithReserve) {
        return RepegHelper._getCashValuesWithReserve(poolData.assets, poolData.feeAndReserve);
    }

    function getProposedPriceScales(
        uint256 normalizedAdjustmentStep
    ) external view returns (uint256[] memory proposedScales) {
        return RepegHelper._getProposedPriceScales(repegData, poolData.assets, normalizedAdjustmentStep);
    }

    function getProposedOraclePrices() external view returns (uint256[] memory proposedOracles) {
        return RepegHelper._getProposedOraclePrices(repegData, poolData.assets, poolData.ampFactor);
    }

    function getNorm() external view returns (uint256) {
        return RepegHelper._getNorm(poolData.assets);
    }

    function addReserve(IAsset asset, uint128 amount) external {
        poolData.feeAndReserve[asset].reserveForRepegging += amount;
    }

    function feeAndReserve(IAsset asset) external view returns (FeeAndReserve memory) {
        return poolData.feeAndReserve[asset];
    }
}
