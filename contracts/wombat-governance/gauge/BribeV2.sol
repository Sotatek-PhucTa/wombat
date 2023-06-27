// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.15;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '../interfaces/IBribeV2.sol';
import '../interfaces/IVoter.sol';
import '../rewarders/MultiRewarderPerSecV2.sol';

/**
 * Simple bribe per sec. Distribute bribe rewards to voters
 * Bribe.onVote->updateReward() is a bit different from SimpleRewarder.
 * Here we reduce the original total amount of share
 */
contract BribeV2 is IBribeV2, MultiRewarderPerSecV2 {
    using SafeERC20 for IERC20;

    function onVote(
        address user,
        uint256 newVote,
        uint256 originalTotalVotes
    ) external override onlyMaster nonReentrant returns (uint256[] memory rewards) {
        _updateReward(originalTotalVotes);
        return _onReward(user, newVote);
    }

    function onReward(
        address _user,
        uint256 _lpAmount
    ) external override onlyMaster nonReentrant returns (uint256[] memory rewards) {
        revert('Call onVote instead');
    }

    function _getTotalShare() internal view override returns (uint256) {
        return IVoter(master).weights(address(lpToken)).voteWeight;
    }

    function rewardLength() external view override(IBribeV2, MultiRewarderPerSecV2) returns (uint256) {
        return _rewardLength();
    }

    function rewardTokens() external view override(IBribeV2, MultiRewarderPerSecV2) returns (IERC20[] memory tokens) {
        return _rewardTokens();
    }

    function pendingTokens(
        address _user
    ) external view override(IBribeV2, MultiRewarderPerSecV2) returns (uint256[] memory tokens) {
        return _pendingTokens(_user);
    }
}
