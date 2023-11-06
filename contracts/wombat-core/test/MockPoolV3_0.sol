// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

contract MockPoolV3_0 {
    mapping(uint256 => uint256) public feeCollected;

    function setFee(uint256 index, uint256 value) external {
        feeCollected[index] = value;
    }
}
