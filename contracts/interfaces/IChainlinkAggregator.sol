// Based on aave-protocol implementation
// https://github.com/aave/aave-protocol/blob/e8d020e97/interfaces/IChainlinkAggregator.sol
// Changes:
// - Upgrade to solidity 0.8.5

// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.5;

interface IChainlinkAggregator {
    function latestAnswer() external view returns (int256);
}
