// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

contract MockPoolV3_1 {
    struct FeeAndReserve {
        uint128 feeCollected; // 18 decimals
        uint128 reserveForRepegging; // 18 decimals
    }

    mapping(uint256 => FeeAndReserve) public feeAndReserve;
}
