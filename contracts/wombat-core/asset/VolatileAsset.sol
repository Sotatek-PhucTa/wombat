// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import './DynamicAsset.sol';
import '../interfaces/IVolatileAsset.sol';

/**
 * @title Asset with Dynamic Price
 * @notice Contract presenting an asset in a pool
 * @dev The relative price of an asset may change over time.
 * For example, the ratio of staked BNB : BNB increases as staking reward accrues.
 */
contract VolatileAsset is IVolatileAsset, DynamicAsset {
    /// @notice The current price scale used by the Wombat's invariant
    /// @dev In 18 decimals
    uint128 public priceScale;

    /// @notice The oracle price, which is calculated by the exponential moving average of spot price
    /// @dev In 18 decimals
    uint128 public oraclePrice;

    error PRICE_ORACLE_OVERFLOW();
    error PRICE_SCALE_OVERFLOW();

    constructor(
        address underlyingToken_,
        string memory name_,
        string memory symbol_,
        uint128 priceScale_
    ) DynamicAsset(underlyingToken_, name_, symbol_) {
        priceScale = priceScale_;
        oraclePrice = priceScale_;
    }

    /**
     * @notice get the relative price in WAD
     * @dev return the price scale
     */
    function getRelativePrice() external view override returns (uint256) {
        return priceScale;
    }

    function setOraclePrice(uint256 oraclePrice_) external onlyPool {
        if (oraclePrice_ > type(uint128).max) revert PRICE_ORACLE_OVERFLOW();
        oraclePrice = uint128(oraclePrice_);
    }

    function setPriceScale(uint256 priceScale_) external onlyPool {
        if (priceScale_ > type(uint128).max) revert PRICE_SCALE_OVERFLOW();
        priceScale = uint128(priceScale_);
    }

    function decimals() public view override(Asset, IAsset) returns (uint8) {
        return super.decimals();
    }
}
