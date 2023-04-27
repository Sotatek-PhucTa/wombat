// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import './StkbnbAsset.sol';

/**
 * @title Asset with Dynamic Price
 * @notice Contract presenting an asset in a pool
 * @dev The relative price of an asset may change over time.
 * For example, the ratio of staked BNB : BNB increases as staking reward accrues.
 */
contract WBETH is StkbnbAsset {
    constructor(
        address underlyingToken_,
        string memory name_,
        string memory symbol_,
        IStakePool exchangeRateOracle_
    ) StkbnbAsset(underlyingToken_, name_, symbol_, exchangeRateOracle_) {}
}
