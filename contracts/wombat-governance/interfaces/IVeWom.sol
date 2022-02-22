// SPDX-License-Identifier: MIT
pragma solidity 0.8.5;

/**
 * @dev Interface of the VeWom
 */
interface IVeWom {
    struct Breeding {
        uint48 unlockTime;
        uint104 WomAmount;
        uint104 veWomAmount;
    }

    struct UserInfo {
        Breeding[] breedings;
    }

    function totalSupply() external view returns (uint256);

    function balanceOf(address _addr) external view returns (uint256);

    function isUser(address _addr) external view returns (bool);

    function getUserInfo(address addr) external view returns (UserInfo memory);

    function mint(uint256 amount, uint256 lockDays) external;

    function burn(uint256 slot) external;
}
