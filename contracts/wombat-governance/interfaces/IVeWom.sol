// SPDX-License-Identifier: MIT
pragma solidity 0.8.5;

/**
 * @dev Interface of the VeWom
 */
interface IVeWom {
    function totalSupply() external view returns (uint256);

    function balanceOf(address _addr) external view returns (uint256);

    function isUser(address _addr) external view returns (bool);

    function mint(uint256 amount, uint256 lockDays) external;

    function burn(uint256 slot) external;
}
