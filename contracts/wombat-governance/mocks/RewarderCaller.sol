// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import '../interfaces/IMultiRewarder.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

/**
 * This contract simulates MasterWombat for MultiRewarderPerSec.
 */
contract RewarderCaller {
    // Proxy onReward calls to rewarder.
    function onReward(address rewarder, address user, uint256 lpAmount) public returns (uint256[] memory rewards) {
        IERC20 lpToken = IMultiRewarder(rewarder).lpToken();
        // Rewarder use master's lpToken balance as totalShare. Make sure we have enough.
        require(lpToken.balanceOf(address(this)) >= lpAmount, 'RewarderCaller must have sufficient lpToken balance');

        return IMultiRewarder(rewarder).onReward(user, lpAmount);
    }
}
