// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import './DynamicPoolV4.sol';
import './RepegHelper.sol';
import '../interfaces/IVolatileAsset.sol';
import '../../wombat-governance/libraries/LogExpMath.sol';

/**
 * @title Volatile Pool with internal oracle
 * @notice Manages deposits, withdrawals and swaps for volatile pool with internal oracle
 * @dev Fully unveil the power of wombat by enabling oracle and attempt repeg after a swap if repeg condition is met
 */
contract VolatilePool is DynamicPoolV4 {
    using AssetLibrary for AssetLibrary.AssetMap;
    using DSMath for uint256;
    using SignedSafeMath for uint256;
    using SignedSafeMath for int256;

    /// @notice The base asset that always has `priceScale` = 1
    /// @dev It is used to calculate the relative price of other assets

    RepegData repegData;
    uint256[50] private __gap;

    //#region overrides

    function initialize(uint256 ampFactor_, uint256 haircutRate_) public override {
        super.initialize(ampFactor_, haircutRate_);

        RepegData storage myStruct = repegData;
        myStruct.adjustmentStep = 0.0005e18;
        myStruct.oracleEmaHalfTime = 600;
        myStruct.lastOracleTimestamp = uint128(block.timestamp);
    }

    /**
     * @notice This hook is called after each swap. This is the most important function in this contract
     */
    function _postSwapHook() internal override {
        RepegHelper.updateOracle(repegData, poolData.assets, poolData.ampFactor);
        attemptRepeg();
    }

    // function _accumulateFee(IAsset asset, uint256 amount) internal override {
    //     // TODO: Shall we hard code the value or use a parameter?
    //     poolData.feeAndReserve[asset].feeCollected += amount.to128() / 2;
    //     poolData.feeAndReserve[asset].reserveForRepegging += amount.to128() / 2;
    // }

    //#endregion overrides

    /// @dev This function looks safe from re-entrancy attack, since it doesn't interact with non-trusted contracts
    function attemptRepeg() public returns (bool success) {
        return RepegHelper.attemptRepeg(repegData, poolData.assets, poolData.feeAndReserve, poolData.ampFactor);
    }

    //#region queries

    function checkRepegCondition()
        external
        view
        returns (bool canRepeg, uint256 proposedGlobalEquilCovRatio, uint256[] memory proposedScales)
    {
        return RepegHelper.checkRepegCondition(repegData, poolData.assets, poolData.feeAndReserve, poolData.ampFactor);
    }

    function estimateNewGlobalEquilCovRatio()
        external
        view
        returns (uint256 proposedGlobalEquilCovRatio, uint256[] memory proposedScales)
    {
        return
            RepegHelper.estimateNewGlobalEquilCovRatio(
                repegData,
                poolData.assets,
                poolData.feeAndReserve,
                poolData.ampFactor
            );
    }

    function getMarketPrice(IVolatileAsset asset) external view returns (uint256) {
        return RepegHelper.getMarketPrice(repegData, asset, poolData.ampFactor);
    }

    function quoteIdealSwapRate(IVolatileAsset assetX, IVolatileAsset assetY) external view returns (uint256) {
        return RepegHelper.quoteIdealSwapRate(assetX, assetY, poolData.ampFactor);
    }

    //#endregion queries

    //#region setters

    function setPriceAnchor(IVolatileAsset priceAnchor_) external onlyOwner {
        require(address(priceAnchor_) != address(0));
        RepegData storage myStruct = repegData;
        myStruct.priceAnchor = priceAnchor_;
    }

    function setAdjustmentStep(uint96 adjustmentStep_) external onlyOwner {
        require(adjustmentStep_ <= WAD);
        RepegData storage myStruct = repegData;
        myStruct.adjustmentStep = adjustmentStep_;
    }

    function setOracleEmaHalfTime(uint128 oracleEmaHalfTime_) external onlyOwner {
        require(oracleEmaHalfTime_ >= 60);
        RepegData storage myStruct = repegData;
        myStruct.oracleEmaHalfTime = oracleEmaHalfTime_;
    }

    //#endregion setters
}
