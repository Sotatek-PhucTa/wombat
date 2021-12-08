// DO NOT DEPLOY TO MAINNET
// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.5;

import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../vesting/TokenVesting.sol';

contract TestTokenVesting is TokenVesting {
    constructor(
        address vestedTokenAddress,
        uint256 startTimestamp,
        uint256 durationSeconds,
        uint256 unlockDurationSeconds
    ) TokenVesting(vestedTokenAddress, startTimestamp, durationSeconds, unlockDurationSeconds) {}

    function test_vestingSchedule(uint256 totalAllocation, uint256 timestamp) external returns (uint256) {
        return _vestingSchedule(totalAllocation, timestamp);
    }

    function test_calculateInterval(uint256 timestamp) external view returns (uint256) {
        return _calculateInterval(timestamp);
    }
}
