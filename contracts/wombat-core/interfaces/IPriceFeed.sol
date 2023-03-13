// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.5;

interface IPriceFeed {
    /**
     * @notice return price of the asset in 18 decimals
     */
    function getLatestPrice(address _token) external view returns (uint256);
}
