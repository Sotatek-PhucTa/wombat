// SPDX-License-Identifier: MIT
pragma solidity 0.8.5;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '../wombat-core/libraries/DSMath.sol';
import './interfaces/IVeWom.sol';
import './interfaces/IMasterWombat.sol';
import './interfaces/IRewarder.sol';

/// This contract rewards users in function of their amount of lp staked (dialuting pool) factor (non-dialuting pool)
/// Factor and sumOfFactors are updated by contract veWom.sol after any veWom minting/burning (veERC20Upgradeable hook).
/// Note that it's ownable and the owner wields tremendous power. The ownership
/// will be transferred to a governance smart contract once Wombat is sufficiently
/// distributed and the community can show to govern itself.
contract MasterWombat is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    IMasterWombat
{
    using DSMath for uint256;
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    // Info of each user.
    struct UserInfo {
        uint256 amount; // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
        uint256 factor; // factor = veWom.balanceOf()  / lpAmount
        //
        // We do some fancy math here. Basically, any point in time, the amount of WOMs
        // entitled to a user but is pending to be distributed is:
        //
        //   (user.factor * pool.accWomPerShare) - user.rewardDebt
        //
        // Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
        //   1. The pool's `accWomPerShare` and lastRewardTimestamp` gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
    }

    // Info of each pool.
    struct PoolInfo {
        IERC20 lpToken; // Address of LP token contract.
        uint256 allocPoint; // How many allocation points assigned to this pool. WOMs to distribute per second.
        uint256 lastRewardTimestamp; // Last timestamp that WOMs distribution occurs.
        uint256 accWomPerShare; // Accumulated WOMs per share
        IRewarder rewarder;
        uint256 sumOfFactors; // the sum of all non dialuting factors by all of the users in the pool
    }

    // WOM Token
    IERC20 public wom;
    // Venom does not seem to hurt the Wombat, it only makes it stronger.
    IVeWom public veWom;
    // New MasterWombat address for future migrations
    // IMasterWombat newMasterWombat;
    IMasterWombat newMasterWombat;
    // WOM tokens created per second.
    uint256 public womPerSec;
    // Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint;
    // The timestamp when WOM mining starts.
    uint256 public startTimestamp;
    // Info of each pool.
    PoolInfo[] public poolInfo;
    // Set of all LP tokens that have been added as pools
    EnumerableSet.AddressSet private lpTokens;
    // Info of each user that stakes LP tokens.
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    // Amount of pending WOM the user has
    mapping(uint256 => mapping(address => uint256)) public pendingWom;

    event Add(uint256 indexed pid, uint256 allocPoint, IERC20 indexed lpToken, IRewarder indexed rewarder);
    event Set(uint256 indexed pid, uint256 allocPoint, IRewarder indexed rewarder, bool overwrite);
    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event DepositFor(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event UpdatePool(uint256 indexed pid, uint256 lastRewardTimestamp, uint256 sumOfFactors, uint256 accWomPerShare);
    event Harvest(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event UpdateEmissionRate(address indexed user, uint256 womPerSec);
    event UpdateVeWom(address indexed user, address oldVeWom, address newVeWom);

    /// @dev Modifier ensuring that certain function can only be called by VeWom
    modifier onlyVeWom() {
        require(address(veWom) == msg.sender, 'MasterWombat: ');
        _;
    }

    function initialize(
        IERC20 wom_,
        IVeWom veWom_,
        uint256 womPerSec,
        uint256 startTimestamp_
    ) external initializer {
        require(address(wom_) != address(0), 'wom address cannot be zero');
        require(address(veWom_) != address(0), 'veWom address cannot be zero');
        require(womPerSec != 0, 'wom per sec cannot be zero');

        __Ownable_init();
        __ReentrancyGuard_init_unchained();
        __Pausable_init_unchained();

        wom = wom_;
        veWom = veWom_;
        womPerSec = womPerSec;
        startTimestamp = startTimestamp_;
    }

    /**
     * @dev pause pool, restricting certain operations
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev unpause pool, enabling certain operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // function setnewMasterWombat(IMasterWombat _newMasterWombat) external onlyOwner {
    //     newMasterWombat = _newMasterWombat;
    // }

    /// @notice returns pool length
    function poolLength() external view override returns (uint256) {
        return poolInfo.length;
    }

    /// @notice Add a new lp to the pool. Can only be called by the owner.
    /// @dev Reverts if the same LP token is added more than once.
    /// @param allocPoint allocation points for this LP
    /// @param lpToken the corresponding lp token
    /// @param rewarder the rewarder
    function add(
        uint256 allocPoint,
        IERC20 lpToken,
        IRewarder rewarder
    ) public onlyOwner {
        require(Address.isContract(address(lpToken)), 'add: LP token must be a valid contract');
        require(
            Address.isContract(address(rewarder)) || address(rewarder) == address(0),
            'add: rewarder must be contract or zero'
        );
        require(!lpTokens.contains(address(lpToken)), 'add: LP already added');

        // update all pools
        massUpdatePools();

        // update last time rewards were calculated to now
        uint256 lastRewardTimestamp = block.timestamp > startTimestamp ? block.timestamp : startTimestamp;

        // add allocPoint to total alloc points
        totalAllocPoint = totalAllocPoint + allocPoint;

        // update PoolInfo with the new LP
        poolInfo.push(
            PoolInfo({
                lpToken: lpToken,
                allocPoint: allocPoint,
                lastRewardTimestamp: lastRewardTimestamp,
                accWomPerShare: 0,
                rewarder: rewarder,
                sumOfFactors: 0
            })
        );

        // add lpToken to the lpTokens enumerable set
        lpTokens.add(address(lpToken));
        emit Add(poolInfo.length - 1, allocPoint, lpToken, rewarder);
    }

    /// @notice Update the given pool's WOM allocation point. Can only be called by the owner.
    /// @param pid the pool id
    /// @param allocPoint allocation points
    /// @param rewarder the rewarder
    /// @param overwrite overwrite rewarder?
    function set(
        uint256 pid,
        uint256 allocPoint,
        IRewarder rewarder,
        bool overwrite
    ) public onlyOwner {
        require(
            Address.isContract(address(rewarder)) || address(rewarder) == address(0),
            'set: rewarder must be contract or zero'
        );
        massUpdatePools();
        totalAllocPoint = totalAllocPoint - poolInfo[pid].allocPoint + allocPoint;
        poolInfo[pid].allocPoint = allocPoint;
        if (overwrite) {
            poolInfo[pid].rewarder = rewarder;
        }
        emit Set(pid, allocPoint, overwrite ? rewarder : poolInfo[pid].rewarder, overwrite);
    }

    /// @notice View function to see pending WOMs on frontend.
    /// @param pid the pool id
    /// @param userAddress the user address
    function pendingTokens(uint256 pid, address userAddress)
        external
        view
        override
        returns (
            uint256 pendingRewards,
            address bonusTokenAddress,
            string memory bonusTokenSymbol,
            uint256 pendingBonusRewards
        )
    {
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][userAddress];
        uint256 accWomPerShare = pool.accWomPerShare;
        if (block.timestamp > pool.lastRewardTimestamp && pool.sumOfFactors != 0) {
            uint256 secondsElapsed = block.timestamp - pool.lastRewardTimestamp;
            uint256 womReward = (secondsElapsed * womPerSec * pool.allocPoint) / totalAllocPoint;
            accWomPerShare += womReward / pool.sumOfFactors;
        }
        pendingRewards = (user.factor * accWomPerShare) + pendingWom[pid][userAddress] - user.rewardDebt;

        // If it's a double reward farm, we return info about the bonus token
        if (address(pool.rewarder) != address(0)) {
            (bonusTokenAddress, bonusTokenSymbol) = rewarderBonusTokenInfo(pid);
            pendingBonusRewards = pool.rewarder.pendingTokens(userAddress);
        }
    }

    /// @notice Get bonus token info from the rewarder contract for a given pool, if it is a double reward farm
    /// @param pid the pool id
    function rewarderBonusTokenInfo(uint256 pid)
        public
        view
        override
        returns (address bonusTokenAddress, string memory bonusTokenSymbol)
    {
        PoolInfo storage pool = poolInfo[pid];
        if (address(pool.rewarder) != address(0)) {
            bonusTokenAddress = address(pool.rewarder.rewardToken());
            bonusTokenSymbol = IERC20Metadata(pool.rewarder.rewardToken()).symbol();
        }
    }

    /// @notice Update reward variables for all pools.
    /// @dev Be careful of gas spending!
    function massUpdatePools() public override {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            _updatePool(pid);
        }
    }

    /// @notice Update reward variables of the given pool to be up-to-date.
    /// @param pid the pool id
    function updatePool(uint256 pid) external override {
        _updatePool(pid);
    }

    function _updatePool(uint256 pid) private {
        PoolInfo storage pool = poolInfo[pid];
        // update only if now > last time we updated rewards
        if (block.timestamp > pool.lastRewardTimestamp) {
            // if sumOfFactors is 0, update lastRewardTime and quit function
            if (pool.sumOfFactors == 0) {
                pool.lastRewardTimestamp = block.timestamp;
                return;
            }
            // calculate seconds elapsed since last update
            uint256 secondsElapsed = block.timestamp - pool.lastRewardTimestamp;

            // calculate wom reward
            uint256 womReward = (secondsElapsed * womPerSec * pool.allocPoint) / totalAllocPoint;

            // update accWomPerShare to reflect dialuting rewards
            pool.accWomPerShare += womReward / pool.sumOfFactors;

            // update lastRewardTimestamp to now
            pool.lastRewardTimestamp = block.timestamp;
            emit UpdatePool(pid, pool.lastRewardTimestamp, pool.sumOfFactors, pool.accWomPerShare);
        }
    }

    /// @notice Helper function to migrate fund from multiple pools to the new MasterWombat.
    /// @notice user must initiate transaction from MasterWombat
    /// @dev Assume the orginal MasterWombat has stopped emisions
    /// hence we can skip updatePool() to save gas cost
    function migrate(uint256[] calldata _pids) external override nonReentrant {
        require(address(newMasterWombat) != (address(0)), 'to where?');

        _multiClaim(_pids);
        for (uint256 i = 0; i < _pids.length; ++i) {
            uint256 pid = _pids[i];
            UserInfo storage user = userInfo[pid][msg.sender];

            if (user.amount > 0) {
                PoolInfo storage pool = poolInfo[pid];
                pool.lpToken.approve(address(newMasterWombat), user.amount);
                newMasterWombat.depositFor(pid, user.amount, msg.sender);

                user.amount = 0;
                // As we assume the MasterWombat has stopped emission so that we can skip updating
                // user.factor and pool.sumOfFactors
            }
        }
    }

    /// @notice Deposit LP tokens to MasterWombat for WOM allocation on behalf of user
    /// @dev user must initiate transaction from MasterWombat
    /// @param pid the pool id
    /// @param amount amount to deposit
    /// @param userAddress the user being represented
    function depositFor(
        uint256 pid,
        uint256 amount,
        address userAddress
    ) external override nonReentrant {
        require(tx.origin == userAddress, 'depositFor: wut?');

        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][userAddress];
        _claim(pid, userAddress);

        // update amount and factor
        uint256 oldFactor = user.factor;
        user.amount += amount;
        user.factor = _getFactor(user.amount, veWom.balanceOf(userAddress));
        pool.sumOfFactors = pool.sumOfFactors + user.factor - oldFactor;

        // update reward debt
        user.rewardDebt = user.factor * pool.accWomPerShare;

        pool.lpToken.safeTransferFrom(msg.sender, address(this), amount);
        emit DepositFor(userAddress, pid, amount);
    }

    function _getFactor(uint256 amount, uint256 veWomBal) internal pure returns (uint256) {
        // TODO: implement
        return amount + veWomBal * amount.sqrt().sqrt();
    }

    function _claim(uint256 pid, address userAddress) internal returns (uint256 rewards, uint256 additionalRewards) {
        _updatePool(pid);
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][userAddress];
        if (user.amount > 0) {
            rewards = (user.factor * pool.accWomPerShare) + pendingWom[pid][userAddress] - user.rewardDebt;
            pendingWom[pid][userAddress] = 0;

            // update reward debt
            user.rewardDebt = user.factor * pool.accWomPerShare;

            // send reward
            rewards = safeWomTransfer(payable(userAddress), rewards);
            emit Harvest(userAddress, pid, rewards);

            // if existant, get external rewarder rewards for pool
            IRewarder rewarder = pool.rewarder;
            if (address(rewarder) != address(0)) {
                additionalRewards = rewarder.onReward(userAddress, user.amount);
            }
        }
    }

    /// @notice Deposit LP tokens to MasterWombat for WOM allocation.
    /// @dev it is possible to call this function with amount == 0 to claim current rewards
    /// @param pid the pool id
    /// @param amount amount to deposit
    function deposit(uint256 pid, uint256 amount)
        external
        override
        nonReentrant
        whenNotPaused
        returns (uint256 rewards, uint256 additionalRewards)
    {
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][msg.sender];
        (rewards, additionalRewards) = _claim(pid, msg.sender);

        // update amount and factor
        uint256 oldFactor = user.factor;
        user.amount += amount;
        user.factor = _getFactor(user.amount, veWom.balanceOf(msg.sender));
        pool.sumOfFactors = pool.sumOfFactors + user.factor - oldFactor;

        // update reward debt
        user.rewardDebt = user.factor * pool.accWomPerShare;

        pool.lpToken.safeTransferFrom(address(msg.sender), address(this), amount);
        emit Deposit(msg.sender, pid, amount);
    }

    /// @notice claims rewards for multiple pids
    /// @param _pids array pids, pools to claim
    function multiClaim(uint256[] memory _pids)
        external
        override
        nonReentrant
        whenNotPaused
        returns (
            uint256,
            uint256[] memory,
            uint256[] memory
        )
    {
        return _multiClaim(_pids);
    }

    /// @notice private function to claim rewards for multiple pids
    /// @param _pids array pids, pools to claim
    function _multiClaim(uint256[] memory _pids)
        private
        returns (
            uint256 totalRewards,
            uint256[] memory rewards,
            uint256[] memory additionalRewards
        )
    {
        rewards = new uint256[](_pids.length);
        additionalRewards = new uint256[](_pids.length);
        for (uint256 i = 0; i < _pids.length; ++i) {
            (rewards[i], additionalRewards[i]) = _claim(_pids[i], msg.sender);
            totalRewards += rewards[i];
        }
    }

    /// @notice Withdraw LP tokens from MasterWombat.
    /// @notice Automatically harvest pending rewards and sends to user
    /// @param pid the pool id
    /// @param amount the amount to withdraw
    function withdraw(uint256 pid, uint256 amount)
        external
        override
        nonReentrant
        whenNotPaused
        returns (uint256 rewards, uint256 additionalRewards)
    {
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][msg.sender];
        require(user.amount >= amount, 'withdraw: not good');
        (rewards, additionalRewards) = _claim(pid, msg.sender);

        uint256 oldFactor = user.factor;
        user.amount -= amount;
        user.factor = _getFactor(user.amount, veWom.balanceOf(msg.sender));
        pool.sumOfFactors = pool.sumOfFactors + user.factor - oldFactor;

        // update reward debt
        user.rewardDebt = user.factor * pool.accWomPerShare;

        pool.lpToken.safeTransfer(address(msg.sender), amount);
        emit Withdraw(msg.sender, pid, amount);
    }

    /// @notice Withdraw without caring about rewards. EMERGENCY ONLY.
    /// @param pid the pool id
    function emergencyWithdraw(uint256 pid) public override nonReentrant {
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][msg.sender];
        pool.lpToken.safeTransfer(address(msg.sender), user.amount);

        // update non-dialuting factor
        pool.sumOfFactors = pool.sumOfFactors - user.factor;
        user.factor = 0;

        // update dialuting factors
        user.amount = 0;
        user.rewardDebt = 0;

        emit EmergencyWithdraw(msg.sender, pid, user.amount);
    }

    /// @notice Safe wom transfer function, just in case if rounding error causes pool to not have enough WOMs.
    /// @param _to beneficiary
    /// @param amount the amount to transfer
    function safeWomTransfer(address payable _to, uint256 amount) private returns (uint256) {
        uint256 womBalance = wom.balanceOf(address(this));

        // perform additional check in case there are no more wom tokens to distribute.
        // emergency withdraw would be necessary
        require(womBalance > 0, 'No tokens to distribute');

        if (amount > womBalance) {
            wom.transfer(_to, womBalance);
            return womBalance;
        } else {
            wom.transfer(_to, amount);
            return amount;
        }
    }

    /// @notice updates emission rate
    /// @param womPerSec wom amount to be updated
    /// @dev Pancake has to add hidden dummy pools inorder to alter the emission,
    /// @dev here we make it simple and transparent to all.
    function updateEmissionRate(uint256 womPerSec) external onlyOwner {
        massUpdatePools();
        womPerSec = womPerSec;
        emit UpdateEmissionRate(msg.sender, womPerSec);
    }

    /// @notice updates veWom address
    /// @param _newVeWom the new veWom address
    function setVeWom(IVeWom _newVeWom) external onlyOwner {
        require(address(_newVeWom) != address(0));
        massUpdatePools();
        IVeWom oldVeWom = veWom;
        veWom = _newVeWom;
        emit UpdateVeWom(msg.sender, address(oldVeWom), address(_newVeWom));
    }

    /// @notice updates factor after any veWom token operation (minting/burning)
    /// @param userAddress the user to update
    /// @param newVeWomBalance the amount of veWom
    /// @dev can only be called by veWom
    function updateFactor(address userAddress, uint256 newVeWomBalance) external override onlyVeWom {
        // loop over each pool : beware gas cost!
        uint256 length = poolInfo.length;

        for (uint256 pid = 0; pid < length; ++pid) {
            UserInfo storage user = userInfo[pid][userAddress];

            // skip if user doesn't have any deposit in the pool
            if (user.amount == 0) {
                continue;
            }

            PoolInfo storage pool = poolInfo[pid];

            // first, update pool
            _updatePool(pid);
            // calculate pending
            uint256 pending = (user.factor * pool.accWomPerShare) - user.rewardDebt;
            // increase pendingWom
            pendingWom[pid][userAddress] += pending;
            // get oldFactor
            uint256 oldFactor = user.factor; // get old factor
            // calculate newFactor using
            uint256 newFactor = _getFactor(user.amount, newVeWomBalance);
            // update user factor
            user.factor = newFactor;
            // update reward debt, take into account newFactor
            user.rewardDebt = newFactor * pool.accWomPerShare;
            // also, update sumOfFactors
            pool.sumOfFactors = pool.sumOfFactors + newFactor - oldFactor;
        }
    }

    /// @notice In case we need to manually migrate WOM funds from MasterWombat
    /// Sends all remaining wom from the contract to the owner
    function emergencyWomWithdraw() external onlyOwner {
        wom.safeTransfer(address(msg.sender), wom.balanceOf(address(this)));
    }
}
