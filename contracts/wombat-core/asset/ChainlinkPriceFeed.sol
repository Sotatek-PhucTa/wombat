// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import '@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol';

import './OraclePriceFeed.sol';

/**
 * @title Chainlink Price Feed
 * @notice Contract to get the latest prices for multiple tokens from Chainlink
 */
contract ChainlinkPriceFeed is OraclePriceFeed {
    mapping(IERC20 => AggregatorV3Interface) public usdPriceFeeds;

    event UpdatePriceFeed(IERC20 token, AggregatorV3Interface priceFeed);

    function initialize() public initializer {
        __Ownable_init();
    }

    /**
     * Returns the latest price.
     */
    function getLatestPrice(IERC20 _token) external view returns (uint256 price) {
        AggregatorV3Interface priceFeed = usdPriceFeeds[_token];
        // prettier-ignore
        (
            /* uint80 roundID */,
            int256 answer,
            /* uint startedAt */,
            uint256 updatedAt,
            /* uint80 answeredInRound */
        ) = priceFeed.latestRoundData();

        if (block.timestamp - updatedAt > maxPriceAge) {
            return _getFallbackPrice(_token);
        } else {
            require(answer > 0);
            return (uint256(answer) * 1e18) / 10 ** (priceFeed.decimals());
        }
    }

    function setChainlinkUsdPriceFeed(IERC20 _token, AggregatorV3Interface _priceFeed) external onlyOwner {
        usdPriceFeeds[_token] = _priceFeed;
        emit UpdatePriceFeed(_token, _priceFeed);
    }
}
