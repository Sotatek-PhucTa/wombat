// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.5;

import '../pool/VolatilePool.sol';

contract MockVolatilePool is VolatilePool {
    function getNormalizedAdjustmentStep(uint256 norm) external view returns (uint256) {
        return super._getNormalizedAdjustmentStep(norm);
    }

    function getCashValuesWithReserve() external view returns (uint256[] memory cashValuesWithReserve) {
        return super._getCashValuesWithReserve();
    }

    function getProposedPriceScales(
        uint256 normalizedAdjustmentStep
    ) external view returns (uint256[] memory proposedScales) {
        return super._getProposedPriceScales(normalizedAdjustmentStep);
    }

    function getProposedOraclePrices() external view returns (uint256[] memory proposedOracles) {
        return super._getProposedOraclePrices();
    }

    function addReserve(IAsset asset, uint128 amount) external {
        _feeAndReserve[asset].reserveForRepegging += amount;
    }

    function feeAndReserve(IAsset asset) external view returns (FeeAndReserve memory) {
        return _feeAndReserve[asset];
    }
}
