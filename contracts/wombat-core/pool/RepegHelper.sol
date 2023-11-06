// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import './CoreV4.sol';
import './PoolV4Data.sol';
import '../interfaces/IRelativePriceProvider.sol';
import '../libraries/DSMath.sol';
import '../libraries/SignedSafeMath.sol';
import '../../wombat-governance/libraries/LogExpMath.sol';

struct RepegData {
    // for oracle
    uint128 oracleEmaHalfTime;
    uint128 lastOracleTimestamp;
    // for repegging condition
    IVolatileAsset priceAnchor;
    uint96 adjustmentStep;
}

/**
 * @title Core
 * @notice Handles math operations of Wombat protocol. Assume all params are signed integer with 18 decimals
 * @dev Uses OpenZeppelin's SignedSafeMath and DSMath's WAD for calculations.
 * Note: Internal functions are for testing purpose
 * Change log:
 * - Move view functinos (quotes, high cov ratio fee) from the Pool contract to this contract
 * - Add quote functions for cross chain swaps
 */
library RepegHelper {
    using AssetLibrary for AssetLibrary.AssetMap;
    using DSMath for uint256;
    using SignedSafeMath for int256;
    using SignedSafeMath for uint256;

    int256 private constant WAD_I = 10 ** 18;
    uint256 private constant WAD = 10 ** 18;

    //#region Events

    event Repeg(uint256 newGlobalEquilCovRatio);

    //#endregion Events

    //#region private Oracle

    /**
     * @notice Update oracle prices after coverage ratio of assets are changed, or price scales are updated
     */
    function updateOracle(
        RepegData storage myStruct,
        AssetLibrary.AssetMap storage _assets,
        uint256 ampFactor
    ) external {
        // TODO: shall we do that after deposit / withdrawal?
        if (myStruct.lastOracleTimestamp == block.timestamp) {
            // Update oracle only once per block in case of oracle manipulation
            return;
        }
        uint256[] memory proposedOracles = _getProposedOraclePrices(myStruct, _assets, ampFactor);
        uint256 assetCount = _assets.count();
        for (uint256 i; i < assetCount; ++i) {
            IVolatileAsset asset = IVolatileAsset(address(_assets.getAssetAtIndex(i)));
            asset.setOraclePrice(proposedOracles[i]);
        }
        myStruct.lastOracleTimestamp = uint128(block.timestamp);
    }

    // Queries

    /**
     * @notice get the market price of an asset in terms of the priceAnchor (stablecoin in most cast)
     * @dev aka `priceLast`
     */
    function getMarketPrice(
        RepegData storage myStruct,
        IVolatileAsset asset,
        uint256 ampFactor
    ) public view returns (uint256) {
        return (quoteIdealSwapRate(asset, myStruct.priceAnchor, ampFactor) * myStruct.priceAnchor.priceScale()) / WAD;
    }

    /**
     * @notice get the marginal swap rate for asset x to asset y
     * @dev The return value is in 18 decimals regardless of decimals of assets
     */
    function quoteIdealSwapRate(
        IVolatileAsset assetX,
        IVolatileAsset assetY,
        uint256 ampFactor
    ) public view returns (uint256) {
        uint256 r_x = uint256(assetX.cash()).wdiv(assetX.liability());
        uint256 r_y = uint256(assetY.cash()).wdiv(assetY.liability());
        uint256 tmp1 = assetX.priceScale() * (WAD + (((ampFactor * WAD) / r_x) * WAD) / r_x);
        uint256 tmp2 = assetY.priceScale() * (WAD + (((ampFactor * WAD) / r_y) * WAD) / r_y);

        return tmp1.wdiv(tmp2);
    }

    function _getProposedOraclePrices(
        RepegData storage myStruct,
        AssetLibrary.AssetMap storage _assets,
        uint256 ampFactor
    ) internal view returns (uint256[] memory proposedOracles) {
        uint256 assetCount = _assets.count();
        proposedOracles = new uint256[](assetCount);
        for (uint256 i; i < assetCount; ++i) {
            IVolatileAsset asset = IVolatileAsset(address(_assets.getAssetAtIndex(i)));
            proposedOracles[i] = _getProposedOraclePrice(myStruct, asset, ampFactor);
        }

        return proposedOracles;
    }

    function _getProposedOraclePrice(
        RepegData storage myStruct,
        IVolatileAsset asset,
        uint256 ampFactor
    ) private view returns (uint256 newOracle) {
        if (asset == myStruct.priceAnchor) {
            // oracle prices of anchor asset never changes
            return asset.oraclePrice();
        }

        uint256 priceLast = getMarketPrice(myStruct, asset, ampFactor);
        uint256 decayFactor = (WAD * WAD) /
            (LogExpMath.pow(2e18, (block.timestamp - myStruct.lastOracleTimestamp).wdiv(myStruct.oracleEmaHalfTime)));

        uint256 priceScale = asset.priceScale();
        uint256 boundedPriceLast;
        if (priceLast >= 2 * priceScale) {
            boundedPriceLast = 2 * priceScale;
        } else if (priceLast <= priceScale / 2) {
            boundedPriceLast = priceScale / 2;
        } else {
            boundedPriceLast = priceLast;
        }

        // Assumption: decayFactor <= WAD
        newOracle = (decayFactor * asset.oraclePrice() + (WAD - decayFactor) * boundedPriceLast) / WAD;
        return newOracle;
    }

    //#endregion private Oracle

    //#region Repegging

    function attemptRepeg(
        RepegData storage myStruct,
        AssetLibrary.AssetMap storage _assets,
        mapping(IAsset => FeeAndReserve) storage _feeAndReserve,
        uint256 ampFactor
    ) external returns (bool success) {
        (bool canRepeg, uint256 proposedGlobalEquilCovRatio, uint256[] memory proposedScales) = checkRepegCondition(
            myStruct,
            _assets,
            _feeAndReserve,
            ampFactor
        );

        if (canRepeg) {
            _doRepeg(myStruct, _assets, _feeAndReserve, proposedGlobalEquilCovRatio, proposedScales);
            return true;
        }
        return false;
    }

    function _doRepeg(
        RepegData storage myStruct,
        AssetLibrary.AssetMap storage _assets,
        mapping(IAsset => FeeAndReserve) storage _feeAndReserve,
        uint256 newGlobalEquilCovRatio,
        uint256[] memory newPriceScales
    ) private {
        uint256 assetCount = _assets.count();
        for (uint256 i; i < assetCount; ++i) {
            IVolatileAsset asset = IVolatileAsset(address(_assets.getAssetAtIndex(i)));
            asset.addCash(_feeAndReserve[asset].reserveForRepegging);
            _feeAndReserve[asset].reserveForRepegging = 0;
        }
        _updatePriceScale(myStruct, _assets, newPriceScales);

        emit Repeg(newGlobalEquilCovRatio);
    }

    function checkRepegCondition(
        RepegData storage myStruct,
        AssetLibrary.AssetMap storage _assets,
        mapping(IAsset => FeeAndReserve) storage _feeAndReserve,
        uint256 ampFactor
    ) public view returns (bool canRepeg, uint256 proposedGlobalEquilCovRatio, uint256[] memory proposedScales) {
        // Condition 1: norm, which value is `root-mean-square of relative price deviation * number of assets`,
        // is greater than adjustment step
        uint256 norm = _getNorm(_assets);
        if (norm < myStruct.adjustmentStep) {
            return (false, proposedGlobalEquilCovRatio, proposedScales);
        }

        // Condition 2: r* > 1 after repeg

        (proposedGlobalEquilCovRatio, proposedScales) = estimateNewGlobalEquilCovRatio(
            myStruct,
            _assets,
            _feeAndReserve,
            ampFactor
        );

        if (proposedGlobalEquilCovRatio >= WAD) {
            return (true, proposedGlobalEquilCovRatio, proposedScales);
        } else {
            return (false, proposedGlobalEquilCovRatio, proposedScales);
        }
    }

    function estimateNewGlobalEquilCovRatio(
        RepegData storage myStruct,
        AssetLibrary.AssetMap storage _assets,
        mapping(IAsset => FeeAndReserve) storage _feeAndReserve,
        uint256 ampFactor
    ) public view returns (uint256 proposedGlobalEquilCovRatio, uint256[] memory proposedScales) {
        uint256 norm = _getNorm(_assets);
        uint256[] memory newCashValues = _getCashValuesWithReserve(_assets, _feeAndReserve);
        uint256 assetCount = newCashValues.length;
        uint256[] memory liabilities = new uint256[](assetCount);
        for (uint256 i; i < assetCount; ++i) {
            IVolatileAsset asset = IVolatileAsset(address(_assets.getAssetAtIndex(i)));
            liabilities[i] = asset.liability();
        }
        uint256 normalizedAdjustmentStep = _getNormalizedAdjustmentStep(myStruct, norm);
        proposedScales = _getProposedPriceScales(myStruct, _assets, normalizedAdjustmentStep);

        proposedGlobalEquilCovRatio = CoreV4.calculateProposedGlobalEquilCovRatio(
            newCashValues,
            liabilities,
            proposedScales,
            ampFactor
        );

        return (proposedGlobalEquilCovRatio, proposedScales);
    }

    /**
     * @notice Update price scale during re-pegging, under the condition that r* >= 1
     */
    function _updatePriceScale(
        RepegData storage myStruct,
        AssetLibrary.AssetMap storage _assets,
        uint256[] memory newPriceScales
    ) private {
        for (uint256 i; i < newPriceScales.length; ++i) {
            IVolatileAsset asset = IVolatileAsset(address(_assets.getAssetAtIndex(i)));
            if (asset != myStruct.priceAnchor) {
                asset.setPriceScale(newPriceScales[i]);
            }
        }
    }

    function _getProposedPriceScales(
        RepegData storage myStruct,
        AssetLibrary.AssetMap storage _assets,
        uint256 normalizedAdjustmentStep
    ) internal view returns (uint256[] memory proposedScales) {
        require(normalizedAdjustmentStep <= WAD);

        uint256 assetCount = _assets.count();
        proposedScales = new uint256[](assetCount);
        for (uint256 i; i < assetCount; ++i) {
            IVolatileAsset asset = IVolatileAsset(address(_assets.getAssetAtIndex(i)));
            proposedScales[i] = _getProposedPriceScale(myStruct, asset, normalizedAdjustmentStep);
        }

        return proposedScales;
    }

    /** @notice root-mean-square of relative price deviation * number of assets
     * @dev We re-peg only if the value is greater than `adjustmentStep`
     */
    function _getNorm(AssetLibrary.AssetMap storage _assets) internal view returns (uint256) {
        uint256 sum;
        uint256 assetCount = _assets.count();
        for (uint256 i; i < assetCount; ++i) {
            IVolatileAsset asset = IVolatileAsset(address(_assets.getAssetAtIndex(i)));
            uint256 oraclePrice = asset.oraclePrice();
            uint256 priceScale = asset.priceScale();
            uint256 x;
            if (oraclePrice >= priceScale) {
                x = oraclePrice.wdiv(priceScale) - WAD;
            } else {
                x = WAD - oraclePrice.wdiv(priceScale);
            }
            sum += x * x; // Note: 36 decimals
        }
        return sum.sqrt();
    }

    /// @notice The relative distance of change of `priceScale` towards `oraclePrice` after repegging
    function _getNormalizedAdjustmentStep(RepegData storage myStruct, uint256 norm) internal view returns (uint256) {
        uint256 value = (uint256(myStruct.adjustmentStep)).wdiv(norm);
        if (value > 0.2e18) {
            // TODO: Shall we hard code the value or use a parameter?
            // upper bounded by 0.2
            return 0.2e18;
        } else {
            return value;
        }
    }

    function _getCashValuesWithReserve(
        AssetLibrary.AssetMap storage _assets,
        mapping(IAsset => FeeAndReserve) storage _feeAndReserve
    ) internal view returns (uint256[] memory cashValuesWithReserve) {
        uint256 assetCount = _assets.count();
        cashValuesWithReserve = new uint256[](assetCount);
        for (uint256 i; i < assetCount; ++i) {
            IVolatileAsset asset = IVolatileAsset(address(_assets.getAssetAtIndex(i)));
            cashValuesWithReserve[i] = asset.cash() + _feeAndReserve[asset].reserveForRepegging;
        }

        return cashValuesWithReserve;
    }

    function _getProposedPriceScale(
        RepegData storage myStruct,
        IVolatileAsset asset,
        uint256 normalizedAdjustmentStep
    ) private view returns (uint256 newPriceScale) {
        if (asset == myStruct.priceAnchor) {
            // price scale of anchor asset never changes
            return asset.priceScale();
        }

        // Assumption: normalizedAdjustmentStep <= WAD, ensured in `_getProposedPriceScales`
        uint256 oracle = asset.oraclePrice();
        uint256 scale = asset.priceScale();
        newPriceScale = ((oracle * normalizedAdjustmentStep + scale * (WAD - normalizedAdjustmentStep)) / WAD);
        return newPriceScale;
    }

    //#endregion Repegging
}
