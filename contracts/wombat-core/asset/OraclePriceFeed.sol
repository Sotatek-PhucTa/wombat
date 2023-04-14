// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import '@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import '../interfaces/IPriceFeed.sol';

/**
 * @title Chainlink Price Feed
 * @notice Contract to get the latest prices for multiple tokens from Chainlink
 */
abstract contract OraclePriceFeed is IPriceFeed, OwnableUpgradeable {
    /// @notice the fallback price feed in case the price is not available on Pyth
    IPriceFeed fallbackPriceFeed;
    uint96 maxPriceAge;

    uint256[50] private _gap;

    event UpdateFallbackPriceFeed(IPriceFeed priceFeed);

    function _getFallbackPrice(IERC20 _token) internal view returns (uint256 price) {
        if (fallbackPriceFeed != IPriceFeed(address(0))) {
            return fallbackPriceFeed.getLatestPrice(_token);
        } else {
            revert('Price is too old');
        }
    }

    function setFallbackPriceFeed(IPriceFeed _fallbackPriceFeed) external onlyOwner {
        fallbackPriceFeed = _fallbackPriceFeed;
        emit UpdateFallbackPriceFeed(_fallbackPriceFeed);
    }

    function setMaxPriceAge(uint96 _maxPriceAge) external onlyOwner {
        maxPriceAge = _maxPriceAge;
    }
}
