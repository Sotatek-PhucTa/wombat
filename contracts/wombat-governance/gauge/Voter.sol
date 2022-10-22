// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import '../interfaces/IBribe.sol';

interface IGauge {
    function notifyRewardAmount(IERC20 token, uint256 amount) external;
}

interface IVe {
    function vote(address user, int256 voteDelta) external;
}

/// Voter can handle gauge voting. WOM rewards are distributed to different MasterWombat->LpToken
/// according the voting weight.Only whitelisted lpTokens can be voted against.
///
/// The flow to distribute reward:
/// 1. At the beginning of MasterWombat.updateFactor/deposit/withdraw, Voter.distribute(lpToken) is called
/// 2. WOM index is updated, and corresponding WOM accumulated over this period is sent to the MasterWombat
///    via MasterWombat.notifyRewardAmount(IERC20 _lpToken, uint256 _amount)
/// 3. MasterWombat will updates the corresponding pool.accWomPerShare and pool.accWomPerFactorShare
///
/// The flow of bribing:
/// 1. When a user vote/unvote, bribe.onVote is called, where the bribe
///    contract works as a similar way to the Rewarder.
///
/// Note: This should also works with boosted pool. But it doesn't work with interest rate model
/// Note 2: Please refer to the comment of MasterWombatV3.notifyRewardAmount for front-running risk
contract Voter is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
    struct GaugeInfo {
        uint128 claimable; // 19.12 fixed point. claimable WOM
        uint128 supplyIndex; // 19.12 fixed point. distributed reward per weight
        uint40 nextEpochStartTime;
        bool whitelist;
        IGauge gaugeManager;
        IBribe bribe; // address of bribe
    }

    uint256 internal constant ACC_TOKEN_PRECISION = 1e15;
    uint256 internal constant EPOCH_DURATION = 7 days;

    IERC20 public wom;
    IVe public veWom;
    IERC20[] public lpTokens; // all LP tokens

    // wom emission related storage
    uint88 public womPerSec; // 8.18 fixed point

    uint128 public index; // 20.18 fixed point. accumulated reward per weight
    uint40 public lastRewardTimestamp; // last timestamp to count

    // vote related storage
    uint256 public totalWeight;
    mapping(IERC20 => uint256) public weights; // lpToken => weight, equals to sum of votes for a LP token
    mapping(address => mapping(IERC20 => uint256)) public votes; // user address => lpToken => votes
    mapping(IERC20 => GaugeInfo) public infos; // lpToken => GaugeInfo

    // bribe related storage
    mapping(IERC20 => address) public bribes; // lpToken => bribe rewarder
    uint40 public firstEpochStartTime;

    event UpdateVote(address user, IERC20 lpToken, uint256 amount);
    event DistributeReward(IERC20 lpToken, uint256 amount);

    function initialize(
        IERC20 _wom,
        IVe _veWom,
        uint88 _womPerSec,
        uint40 _startTimestamp,
        uint40 _firstEpochStartTime
    ) external initializer {
        require(_firstEpochStartTime >= block.timestamp, 'invalid _firstEpochStartTime');
        require(address(_wom) != address(0), 'wom address cannot be zero');
        require(address(_veWom) != address(0), 'veWom address cannot be zero');

        __Ownable_init();
        __ReentrancyGuard_init_unchained();

        wom = _wom;
        veWom = _veWom;
        womPerSec = _womPerSec;
        lastRewardTimestamp = _startTimestamp;
        firstEpochStartTime = _firstEpochStartTime;
    }

    /// @dev this check save more gas than a modifier
    function _checkGaugeExist(IERC20 _lpToken) internal view {
        require(address(infos[_lpToken].gaugeManager) != address(0), 'Voter: gaugeManager not exist');
    }

    /// @notice returns LP tokens length
    function lpTokenLength() external view returns (uint256) {
        return lpTokens.length;
    }

    /// @notice getter function to return vote of a LP token for a user
    function getUserVotes(address _user, IERC20 _lpToken) external view returns (uint256) {
        return votes[_user][_lpToken];
    }

    /// @notice Add LP token into the Voter
    function add(
        IGauge _gaugeManager,
        IERC20 _lpToken,
        IBribe _bribe
    ) external onlyOwner {
        require(infos[_lpToken].whitelist == false, 'voter: already added');
        require(address(_gaugeManager) != address(0));
        require(address(_lpToken) != address(0));
        require(address(infos[_lpToken].gaugeManager) == address(0), 'Voter: gaugeManager is already exist');

        infos[_lpToken].whitelist = true;
        infos[_lpToken].gaugeManager = _gaugeManager;
        infos[_lpToken].bribe = _bribe; // 0 address is allowed
        infos[_lpToken].nextEpochStartTime = _getNextEpochStartTime();
        lpTokens.push(_lpToken);
    }

    function setWomPerSec(uint88 _womPerSec) external onlyOwner {
        require(_womPerSec <= 10000e18, 'reward rate too high'); // in case of index overflow
        _distributeWom();
        womPerSec = _womPerSec;
    }

    /// @notice Pause emission of WOM tokens. Un-distributed rewards are forfeited
    /// Users can still vote/unvote and receive bribes.
    function pause(IERC20 _lpToken) external onlyOwner {
        require(infos[_lpToken].whitelist, 'voter: not whitelisted');
        _checkGaugeExist(_lpToken);

        infos[_lpToken].whitelist = false;
    }

    /// @notice Resume emission of WOM tokens
    function resume(IERC20 _lpToken) external onlyOwner {
        require(infos[_lpToken].whitelist == false, 'voter: not paused');
        _checkGaugeExist(_lpToken);

        // catch up supplyIndex
        _distributeWom();
        infos[_lpToken].supplyIndex = index;
        infos[_lpToken].whitelist = true;
    }

    /// @notice Pause emission of WOM tokens for all assets. Un-distributed rewards are forfeited
    /// Users can still vote/unvote and receive bribes.
    function pauseAll() external onlyOwner {
        _pause();
    }

    /// @notice Resume emission of WOM tokens for all assets
    function resumeAll() external onlyOwner {
        _unpause();
    }

    /// @notice get gaugeManager address for LP token
    function setGauge(IERC20 _lpToken, IGauge _gaugeManager) external onlyOwner {
        require(address(_gaugeManager) != address(0));
        _checkGaugeExist(_lpToken);

        infos[_lpToken].gaugeManager = _gaugeManager;
    }

    /// @notice get bribe address for LP token
    function setBribe(IERC20 _lpToken, IBribe _bribe) external onlyOwner {
        _checkGaugeExist(_lpToken);

        infos[_lpToken].bribe = _bribe; // 0 address is allowed
    }

    /// @notice Vote and unvote WOM emission for LP tokens.
    /// User can vote/unvote a un-whitelisted pool. But no WOM will be emitted.
    /// Bribes are also distributed by the Bribe contract.
    /// Amount of vote should be checked by veWom.vote().
    /// This can also used to distribute bribes when _deltas are set to 0
    /// @param _lpVote address to LP tokens to vote
    /// @param _deltas change of vote for each LP tokens
    function vote(IERC20[] calldata _lpVote, int256[] calldata _deltas)
        external
        nonReentrant
        returns (uint256[] memory bribeRewards)
    {
        // 1. call _updateFor() to update WOM emission
        // 2. update related lpToken weight and total lpToken weight
        // 3. update used voting power and ensure there's enough voting power
        // 4. call IBribe.onVote() to update bribes
        require(_lpVote.length == _deltas.length, 'voter: array length not equal');

        // update index
        _distributeWom();

        uint256 voteCnt = _lpVote.length;
        int256 voteDelta;

        bribeRewards = new uint256[](voteCnt);

        for (uint256 i; i < voteCnt; ++i) {
            IERC20 lpToken = _lpVote[i];
            _checkGaugeExist(lpToken);

            int256 delta = _deltas[i];
            uint256 originalWeight = weights[lpToken];
            if (delta != 0) {
                _updateFor(lpToken);

                // update vote and weight
                if (delta > 0) {
                    // vote
                    votes[msg.sender][lpToken] += uint256(delta);
                    weights[lpToken] = originalWeight + uint256(delta);
                    totalWeight += uint256(delta);
                } else {
                    // unvote
                    require(votes[msg.sender][lpToken] >= uint256(-delta), 'voter: vote underflow');
                    votes[msg.sender][lpToken] -= uint256(-delta);
                    weights[lpToken] = originalWeight - uint256(-delta);
                    totalWeight -= uint256(-delta);
                }

                voteDelta += delta;
                emit UpdateVote(msg.sender, lpToken, votes[msg.sender][lpToken]);
            }

            // update bribe
            if (address(infos[lpToken].bribe) != address(0)) {
                bribeRewards[i] = infos[lpToken].bribe.onVote(msg.sender, votes[msg.sender][lpToken], originalWeight);
            }
        }

        // notice veWom for the new vote, it reverts if vote is invalid
        veWom.vote(msg.sender, voteDelta);
    }

    /// @notice Claim bribes for LP tokens
    /// @dev This function looks safe from re-entrancy attack
    function claimBribes(IERC20[] calldata _lpTokens) external returns (uint256[] memory bribeRewards) {
        bribeRewards = new uint256[](_lpTokens.length);
        for (uint256 i; i < _lpTokens.length; ++i) {
            IERC20 lpToken = _lpTokens[i];
            _checkGaugeExist(lpToken);
            if (address(infos[lpToken].bribe) != address(0)) {
                bribeRewards[i] = infos[lpToken].bribe.onVote(msg.sender, votes[msg.sender][lpToken], weights[lpToken]);
            }
        }
    }

    /// @dev This function looks safe from re-entrancy attack
    function distribute(IERC20 _lpToken) external {
        _distributeWom();
        _updateFor(_lpToken);

        uint256 _claimable = infos[_lpToken].claimable;
        // 1. `_claimable > 0` imples `_checkGaugeExist(_lpToken)`
        // 2. distribute once in each epoch
        // 3. In case WOM is not fueled, it should not create DoS
        if (
            _claimable > 0 &&
            block.timestamp >= infos[_lpToken].nextEpochStartTime &&
            wom.balanceOf(address(this)) > _claimable
        ) {
            infos[_lpToken].claimable = 0;
            infos[_lpToken].nextEpochStartTime = _getNextEpochStartTime();
            emit DistributeReward(_lpToken, _claimable);

            wom.transfer(address(infos[_lpToken].gaugeManager), _claimable);
            infos[_lpToken].gaugeManager.notifyRewardAmount(_lpToken, _claimable);
        }
    }

    /// @notice Update index for accrued WOM
    function _distributeWom() internal {
        if (block.timestamp <= lastRewardTimestamp) {
            return;
        }

        index = to128(_getIndex());
        lastRewardTimestamp = uint40(block.timestamp);
    }

    /// @notice Update supplyIndex for the LP token
    /// @dev Assumption: gaugeManager exists and is not paused, the caller should verify it
    /// @param _lpToken address of the LP token
    function _updateFor(IERC20 _lpToken) internal {
        // calculate claimable amount before update supplyIndex
        infos[_lpToken].claimable = to128(_getClaimable(_lpToken, index));
        infos[_lpToken].supplyIndex = index; // new LP tokens are set to the default global state
    }

    /// @notice In case we need to manually migrate WOM funds from Voter
    /// Sends all remaining wom from the contract to the owner
    function emergencyWomWithdraw() external onlyOwner {
        // SafeERC20 is not needed as WOM will revert if transfer fails
        wom.transfer(address(msg.sender), wom.balanceOf(address(this)));
    }

    /**
     * Read-only functions
     */

    /// @notice Get pending bribes for LP tokens
    function pendingBribes(IERC20[] calldata _lpTokens, address _user)
        external
        view
        returns (uint256[] memory bribeRewards)
    {
        bribeRewards = new uint256[](_lpTokens.length);
        for (uint256 i; i < _lpTokens.length; ++i) {
            IERC20 lpToken = _lpTokens[i];
            if (address(infos[lpToken].bribe) != address(0)) {
                bribeRewards[i] = infos[lpToken].bribe.pendingTokens(_user);
            }
        }
    }

    /// @notice Amount of pending WOM for the LP token
    function pendingWom(IERC20 _lpToken) external view returns (uint256) {
        return _getClaimable(_lpToken, _getIndex());
    }

    /// @notice Calculate the new `index`
    function _getIndex() internal view returns (uint256) {
        if (block.timestamp <= lastRewardTimestamp || totalWeight == 0) {
            return index;
        }

        uint256 secondsElapsed = block.timestamp - lastRewardTimestamp;
        return index + (secondsElapsed * womPerSec * ACC_TOKEN_PRECISION) / totalWeight;
    }

    /// @notice Calculate the new `claimable` for an gauge
    function _getClaimable(IERC20 _lpToken, uint256 _index) internal view returns (uint256) {
        uint256 weight = weights[_lpToken];
        if (weight == 0 || !infos[_lpToken].whitelist || paused()) {
            // WOM emission for un-whitelisted lpTokens are blackholed.
            // Also, don't distribute WOM if the contract is paused
            return infos[_lpToken].claimable;
        }

        // see if there is any difference that need to be accrued
        uint256 delta = _index - infos[_lpToken].supplyIndex;
        if (delta == 0) {
            return infos[_lpToken].claimable;
        }

        uint256 _share = (weight * delta) / ACC_TOKEN_PRECISION; // add accrued difference for each token
        return infos[_lpToken].claimable + _share;
    }

    /// @notice Get the start timestamp of the next epoch
    function _getNextEpochStartTime() internal view returns (uint40) {
        if (block.timestamp < firstEpochStartTime) {
            return firstEpochStartTime;
        }

        uint256 epochCount = (block.timestamp - firstEpochStartTime) / EPOCH_DURATION;
        return uint40(firstEpochStartTime + (epochCount + 1) * EPOCH_DURATION);
    }

    function to128(uint256 val) internal pure returns (uint128) {
        require(val <= type(uint128).max, 'uint128 overflow');
        return uint128(val);
    }
}
