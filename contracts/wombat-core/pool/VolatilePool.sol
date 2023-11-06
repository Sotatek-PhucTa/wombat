// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import './DynamicPoolV3.sol';
import '../interfaces/IVolatileAsset.sol';
import '../../wombat-governance/libraries/LogExpMath.sol';

/**
 * @title Volatile Pool with internal oracle
 * @notice Manages deposits, withdrawals and swaps for volatile pool with internal oracle
 * @dev Fully unveil the power of wombat by enabling oracle and attempt repeg after a swap if repeg condition is met
 */
contract VolatilePool is DynamicPoolV3 {
    using DSMath for uint256;
    using SignedSafeMath for uint256;
    using SignedSafeMath for int256;

    /// @notice The base asset that always has `priceScale` = 1
    /// @dev It is used to calculate the relative price of other assets

    // for repegging condition
    IVolatileAsset internal priceAnchor;
    uint96 internal adjustmentStep;

    // for oracle
    uint128 internal oracleEmaHalfTime;
    uint128 internal lastOracleTimestamp;

    uint256[50] private __gap;

    event Repeg(uint256 newGlobalEquilCovRatio);

    /* Overrides */
    //#region overrides

    function initialize(uint256 ampFactor_, uint256 haircutRate_) public override {
        super.initialize(ampFactor_, haircutRate_);

        adjustmentStep = 0.0005e18;
        oracleEmaHalfTime = 600;

        lastOracleTimestamp = uint128(block.timestamp);
    }

    /**
     * @notice This hook is called after each swap. This is the most important function in this contract
     */
    function _postSwapHook() internal override {
        _updateOracle();
        attemptRepeg();
    }

    function _accumulateFee(IAsset asset, uint256 amount) internal override {
        // TODO: Shall we hard code the value or use a parameter?
        _feeAndReserve[asset].feeCollected += amount.to128() / 2;
        _feeAndReserve[asset].reserveForRepegging += amount.to128() / 2;
    }

    //#endregion overrides

    /* Oracle */
    //#region oracle

    /**
     * @notice Update oracle prices after coverage ratio of assets are changed, or price scales are updated
     */
    function _updateOracle() internal {
        // TODO: shall we do that after deposit / withdrawal?
        if (lastOracleTimestamp == block.timestamp) {
            // Update oracle only once per block in case of oracle manipulation
            return;
        }
        uint256[] memory proposedOracles = _getProposedOraclePrices();
        uint256 assetCount = _sizeOfAssetList();
        for (uint256 i; i < assetCount; ++i) {
            IVolatileAsset asset = IVolatileAsset(address(_getAsset(_getKeyAtIndex(i))));
            asset.setOraclePrice(proposedOracles[i]);
        }
        lastOracleTimestamp = uint128(block.timestamp);
    }

    //#endregion oracle

    /* Repeg */
    //#region repeg

    /// @dev This function looks safe from re-entrancy attack, since it doesn't interact with non-trusted contracts
    function attemptRepeg() public returns (bool success) {
        (bool canRepeg, uint256 proposedGlobalEquilCovRatio, uint256[] memory proposedScales) = checkRepegCondition();

        if (canRepeg) {
            _doRepeg(proposedGlobalEquilCovRatio, proposedScales);
            return true;
        }
        return false;
    }

    function _doRepeg(uint256 newGlobalEquilCovRatio, uint256[] memory newPriceScales) internal {
        uint256 assetCount = _sizeOfAssetList();
        for (uint256 i; i < assetCount; ++i) {
            IVolatileAsset asset = IVolatileAsset(address(_getAsset(_getKeyAtIndex(i))));
            asset.addCash(_feeAndReserve[asset].reserveForRepegging);
            _feeAndReserve[asset].reserveForRepegging = 0;
        }
        _updatePriceScale(newPriceScales);

        emit Repeg(newGlobalEquilCovRatio);
    }

    /**
     * @notice Update price scale during re-pegging, under the condition that r* >= 1
     */
    function _updatePriceScale(uint256[] memory newPriceScales) internal {
        for (uint256 i; i < newPriceScales.length; ++i) {
            IVolatileAsset asset = IVolatileAsset(address(_getAsset(_getKeyAtIndex(i))));
            if (asset != priceAnchor) {
                asset.setPriceScale(newPriceScales[i]);
            }
        }
    }

    //#endregion repeg

    /* Queries */
    //#region queries

    function checkRepegCondition()
        public
        view
        returns (bool canRepeg, uint256 proposedGlobalEquilCovRatio, uint256[] memory proposedScales)
    {
        // Condition 1: norm, which value is `root-mean-square of relative price deviation * number of assets`,
        // is greater than adjustment step
        uint256 norm = getNorm();
        if (norm < adjustmentStep) {
            return (false, proposedGlobalEquilCovRatio, proposedScales);
        }

        // Condition 2: r* > 1 after repeg

        (proposedGlobalEquilCovRatio, proposedScales) = estimateNewGlobalEquilCovRatio(norm);

        if (proposedGlobalEquilCovRatio >= WAD) {
            return (true, proposedGlobalEquilCovRatio, proposedScales);
        } else {
            return (false, proposedGlobalEquilCovRatio, proposedScales);
        }
    }

    function estimateNewGlobalEquilCovRatio(
        uint256 norm
    ) public view returns (uint256 proposedGlobalEquilCovRatio, uint256[] memory proposedScales) {
        uint256[] memory newCashValues = _getCashValuesWithReserve();
        uint256 assetCount = newCashValues.length;
        uint256[] memory liabilities = new uint256[](assetCount);
        for (uint256 i; i < assetCount; ++i) {
            IAsset asset = _getAsset(_getKeyAtIndex(i));
            liabilities[i] = asset.liability();
        }
        uint256 normalizedAdjustmentStep = _getNormalizedAdjustmentStep(norm);
        proposedScales = _getProposedPriceScales(normalizedAdjustmentStep);

        (int256 invariant, int256 SL) = _globalInvariantFunc(newCashValues, liabilities, proposedScales);
        proposedGlobalEquilCovRatio = CoreV3.equilCovRatio(invariant, SL, ampFactor.toInt256()).toUint256();

        return (proposedGlobalEquilCovRatio, proposedScales);
    }

    /**
     * @notice get the market price of an asset in terms of the priceAnchor (stablecoin in most cast)
     * @dev aka `priceLast`
     */
    function getMarketPrice(IVolatileAsset asset) public view returns (uint256) {
        return (getMarginalSwapRate(asset, priceAnchor) * priceAnchor.priceScale()) / WAD;
    }

    /**
     * @notice get the marginal swap rate for asset x to asset y
     * @dev The return value is in 18 decimals regardless of decimals of assets
     */
    function getMarginalSwapRate(IVolatileAsset assetX, IVolatileAsset assetY) public view returns (uint256) {
        uint256 r_x = uint256(assetX.cash()).wdiv(assetX.liability());
        uint256 r_y = uint256(assetY.cash()).wdiv(assetY.liability());
        uint256 tmp1 = assetX.priceScale() * (WAD + (((ampFactor * WAD) / r_x) * WAD) / r_x);
        uint256 tmp2 = assetY.priceScale() * (WAD + (((ampFactor * WAD) / r_y) * WAD) / r_y);

        return tmp1.wdiv(tmp2);
    }

    /** @notice root-mean-square of relative price deviation * number of assets
     * @dev We re-peg only if the value is greater than `adjustmentStep`
     */
    function getNorm() public view returns (uint256) {
        uint256 sum;
        uint256 assetCount = _sizeOfAssetList();
        for (uint256 i; i < assetCount; ++i) {
            IVolatileAsset asset = IVolatileAsset(address(_getAsset(_getKeyAtIndex(i))));
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
    function _getNormalizedAdjustmentStep(uint256 norm) internal view returns (uint256) {
        uint256 value = (uint256(adjustmentStep)).wdiv(norm);
        if (value > 0.2e18) {
            // TODO: Shall we hard code the value or use a parameter?
            // upper bounded by 0.2
            return 0.2e18;
        } else {
            return value;
        }
    }

    function _getCashValuesWithReserve() internal view returns (uint256[] memory cashValuesWithReserve) {
        uint256 assetCount = _sizeOfAssetList();
        cashValuesWithReserve = new uint256[](assetCount);
        for (uint256 i; i < assetCount; ++i) {
            IVolatileAsset asset = IVolatileAsset(address(_getAsset(_getKeyAtIndex(i))));
            cashValuesWithReserve[i] = asset.cash() + _feeAndReserve[asset].reserveForRepegging;
        }

        return cashValuesWithReserve;
    }

    function _getProposedPriceScales(
        uint256 normalizedAdjustmentStep
    ) internal view returns (uint256[] memory proposedScales) {
        require(normalizedAdjustmentStep <= WAD);

        uint256 assetCount = _sizeOfAssetList();
        proposedScales = new uint256[](assetCount);
        for (uint256 i; i < assetCount; ++i) {
            IVolatileAsset asset = IVolatileAsset(address(_getAsset(_getKeyAtIndex(i))));
            proposedScales[i] = _getProposedPriceScale(asset, normalizedAdjustmentStep);
        }

        return proposedScales;
    }

    function _getProposedPriceScale(
        IVolatileAsset asset,
        uint256 normalizedAdjustmentStep
    ) internal view returns (uint256 newPriceScale) {
        if (asset == priceAnchor) {
            // price scale of anchor asset never changes
            return asset.priceScale();
        }

        // Assumption: normalizedAdjustmentStep <= WAD, ensured in `_getProposedPriceScales`
        uint256 oracle = asset.oraclePrice();
        uint256 scale = asset.priceScale();
        newPriceScale = ((oracle * normalizedAdjustmentStep + scale * (WAD - normalizedAdjustmentStep)) / WAD);
        return newPriceScale;
    }

    function _getProposedOraclePrices() internal view returns (uint256[] memory proposedOracles) {
        uint256 assetCount = _sizeOfAssetList();
        proposedOracles = new uint256[](assetCount);
        for (uint256 i; i < assetCount; ++i) {
            IVolatileAsset asset = IVolatileAsset(address(_getAsset(_getKeyAtIndex(i))));
            proposedOracles[i] = _getProposedOraclePrice(asset);
        }

        return proposedOracles;
    }

    function _getProposedOraclePrice(IVolatileAsset asset) internal view returns (uint256 newOracle) {
        if (asset == priceAnchor) {
            // oracle prices of anchor asset never changes
            return asset.oraclePrice();
        }

        uint256 priceLast = getMarketPrice(asset);
        uint256 decayFactor = (WAD * WAD) /
            (LogExpMath.pow(2e18, (block.timestamp - lastOracleTimestamp).wdiv(oracleEmaHalfTime)));

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

    //#endregion queries

    /* Setter */
    //#region setter

    function setPriceAnchor(IVolatileAsset priceAnchor_) external onlyOwner {
        _checkAddress(address(priceAnchor_));
        priceAnchor = priceAnchor_;
    }

    function setAdjustmentStep(uint96 adjustmentStep_) external onlyOwner {
        adjustmentStep = adjustmentStep_;
    }

    function setOracleEmaHalfTime(uint128 oracleEmaHalfTime_) external onlyOwner {
        oracleEmaHalfTime = oracleEmaHalfTime_;
    }

    //#endregion setter
}
