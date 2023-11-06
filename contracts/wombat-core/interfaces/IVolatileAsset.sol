// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.5;

import './IAsset.sol';

interface IVolatileAsset is IAsset {
    function priceScale() external view returns (uint128);

    function oraclePrice() external view returns (uint128);

    function setOraclePrice(uint256 oraclePrice_) external;

    function setPriceScale(uint256 priceScale_) external;
}
