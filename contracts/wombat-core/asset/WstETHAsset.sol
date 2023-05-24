// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import '@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol';

import '../interfaces/IRelativePriceProvider.sol';
import './DynamicAsset.sol';

/**
 * @title WstETHAsset for L2 where chainlink price feeds are available

 * @notice Contract presenting an asset in a pool
 * @dev The relative price of an asset may change over time.
 * For example, the ratio of staked BNB : BNB increases as staking reward accrues.
 */
contract WstETHAsset is DynamicAsset {
    AggregatorV3Interface exchangeRateOracle; // chainlink price feed

    constructor(
        address underlyingToken_,
        string memory name_,
        string memory symbol_,
        AggregatorV3Interface _exchangeRateOracle
    ) DynamicAsset(underlyingToken_, name_, symbol_) {
        exchangeRateOracle = _exchangeRateOracle;
    }

    /**
     * @notice get the relative price in WAD
     */
    function getRelativePrice() external view override returns (uint256) {
        // prettier-ignore
        (
            /* uint80 roundID */,
            int256 answer,
            /* uint startedAt */,
            uint256 updatedAt,
            /* uint80 answeredInRound */
        ) = exchangeRateOracle.latestRoundData();
        require(block.timestamp - updatedAt <= 1 days, 'WstETHAsset: chainlink price too old');

        return uint256(answer);
    }
}
