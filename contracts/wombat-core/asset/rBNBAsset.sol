// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.18;

import '../interfaces/IRelativePriceProvider.sol';
import './DynamicAsset.sol';

interface IStakeManager {
    function getRate() external view returns (uint256);
}

/**
 * @title Asset with Dynamic Price
 * @notice Contract presenting an asset in a pool
 * @dev The relative price of an asset may change over time.
 * For example, the ratio of staked BNB : BNB increases as staking reward accrues.
 */
contract rBNBAsset is DynamicAsset {
    IStakeManager exchangeRateOracle;

    constructor(
        address underlyingToken_,
        string memory name_,
        string memory symbol_,
        IStakeManager _exchangeRateOracle
    ) DynamicAsset(underlyingToken_, name_, symbol_) {
        exchangeRateOracle = _exchangeRateOracle;
    }

    /**
     * @notice get the relative price in WAD
     */
    function getRelativePrice() external view override returns (uint256) {
        return exchangeRateOracle.getRate();
    }
}
