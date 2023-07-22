// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.5;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import './IMasterWombatV3.sol';

/**
 * @dev Interface of BoostedMasterWombat
 */
interface IBoostedMasterWombat is IMasterWombatV3 {
    function getSumOfFactors(uint256 pid) external view returns (uint256 sum);

    function basePartition() external view returns (uint16);
}
