// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import '@pythnetwork/pyth-sdk-solidity/IPyth.sol';
import '@pythnetwork/pyth-sdk-solidity/PythStructs.sol';

import './OraclePriceFeed.sol';

/**
 * @title Pyth Price Feed with fallback
 * @notice Contract to get the latest prices for multiple tokens from Pyth
 */
contract PythPriceFeed is OraclePriceFeed {
    IPyth pyth;
    mapping(IERC20 => bytes32) public priceIDs;

    event UpdatepriceID(IERC20 token, bytes32 priceID);

    function initialize(IPyth _pyth) public initializer {
        __Ownable_init();
        pyth = _pyth;
    }

    /**
     * Returns the latest price.
     */
    function getLatestPrice(IERC20 _token) external view returns (uint256 price) {
        bytes32 priceID = priceIDs[_token];
        PythStructs.Price memory priceStruct = pyth.getPrice(priceID);

        // If the price is too old, use the fallback price feed
        if (block.timestamp - priceStruct.publishTime > maxPriceAge) {
            return _getFallbackPrice(_token);
        } else {
            require(priceStruct.price > 0);
            return (uint256(int256(priceStruct.price)) * 1e18) / 10 ** uint256(int256(priceStruct.expo));
        }
    }

    function setPriceID(IERC20 _token, bytes32 _priceID) external onlyOwner {
        priceIDs[_token] = _priceID;
        emit UpdatepriceID(_token, _priceID);
    }
}
