// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import '../interfaces/IRelativePriceProvider.sol';
import './DynamicAsset.sol';

interface IStakedAvax {
    function getPooledAvaxByShares(uint256 _shares) external view returns (uint256);
}

/**
 * @title sAVAX Asset with Dynamic Price
 * @notice Contract presenting an asset in a pool
 * @dev The relative price of an asset may change over time.
 * For example, the ratio of staked BNB : BNB increases as staking reward accrues.
 */
contract sAVAXAsset is DynamicAsset {
    IStakedAvax exchangeRateOracle;

    constructor(
        address underlyingToken_,
        string memory name_,
        string memory symbol_,
        IStakedAvax _exchangeRateOracle
    ) DynamicAsset(underlyingToken_, name_, symbol_) {
        exchangeRateOracle = _exchangeRateOracle;
    }

    /**
     * @notice get the relative price of 1 unit of token in WAD
     */
    function getRelativePrice() external view override returns (uint256) {
        return exchangeRateOracle.getPooledAvaxByShares(1e18);
    }
}
