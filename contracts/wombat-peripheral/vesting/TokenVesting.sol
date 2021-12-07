// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.5;

import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '@openzeppelin/contracts/utils/Context.sol';
import '@openzeppelin/contracts/utils/math/Math.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import 'hardhat/console.sol';

/**
 * @title VestingWallet (extended for WOM Token Vesting), from OpenZeppelin Contracts v4.4.0 (finance/VestingWallet.sol)
 * @dev This contract handles the vesting of WOM, a ERC20 token for a list of admin-settable beneficiaries.
 * This contract will release the token to the beneficiary following a given vesting schedule.
 * The vesting schedule is customizable through the {vestedAmount} function.
 *
 * WOM token transferred to this contract will follow the vesting schedule as if they were locked from the beginning.
 * Consequently, if the vesting has already started, any amount of tokens sent to this contract will (at least partly)
 * be immediately releasable.
 */
contract TokenVesting is Context, Ownable {
    event ERC20Released(address indexed token, uint256 amount);
    event BeneficiaryAdded(address indexed beneficiary, uint256 amount);

    struct BeneficiaryInfo {
        uint256 _allocationBalance;
        uint256 _allocationReleased;
    }

    IERC20 public vestedToken;

    address[] private _beneficiaryAddresses;
    mapping(address => BeneficiaryInfo) private _beneficiaryInfo;
    uint256 private immutable _start;
    uint256 private immutable _duration;
    uint256 private _totalAllocationBalance;

    // Number of unlock intervals, i.e. unlock every 6 months for 60 months, max = 10
    uint256 private _unlockIntervalsCount = 0;

    // Duration of unlock intervals, i.e. 6 months in seconds = (60 * 60 * 24 * 365) / 2
    uint256 private _unlockDurationSeconds = 15768000;

    /**
     * @dev Set the vested token address, start timestamp and vesting duration of the vesting period.
     */
    constructor(
        address vestedTokenAddress,
        uint256 startTimestamp,
        uint256 durationSeconds
    ) {
        vestedToken = IERC20(vestedTokenAddress);
        _start = startTimestamp;
        _duration = durationSeconds;
    }

    /**
     * @dev Getter for the beneficiary address.
     */
    function beneficiaryCount() external view returns (uint8) {
        return uint8(_beneficiaryAddresses.length);
    }

    /**
     * @dev Getter for the beneficiary address.
     */
    function beneficiaryBalance(address beneficiary) external view returns (uint256) {
        return _beneficiaryInfo[beneficiary]._allocationBalance;
    }

    /**
     * @dev Getter for the total allocation balance of vesting contract.
     */
    function totalAllocationBalance() external view returns (uint256) {
        return _totalAllocationBalance;
    }

    /**
     * @dev Getter for the releaseable amount of all beneficiaries.
     * Loop over array of beneficiary addresses to sum up total releasable amount
     * totalReleasableBalance should always be <= totalUnderlyingBalance
     */
    function totalReleasableBalance() external view returns (uint256) {
        uint256 totalReleasableBalance = 0;
        for (uint8 i = 0; i < _beneficiaryAddresses.length; i++) {
            totalReleasableBalance +=
                _beneficiaryInfo[_beneficiaryAddresses[i]]._allocationReleased +
                _beneficiaryInfo[_beneficiaryAddresses[i]]._allocationBalance;
        }
        return totalReleasableBalance;
    }

    /**
     * @dev Getter for the beneficiary address.
     */
    function totalUnderlyingBalance() external view returns (uint256) {
        return IERC20(vestedToken).balanceOf(address(this));
    }

    /**
     * @dev Getter for the start timestamp.
     */
    function start() public view returns (uint256) {
        return _start;
    }

    /**
     * @dev Getter for the vesting duration.
     */
    function duration() public view returns (uint256) {
        return _duration;
    }

    /**
     * @dev Amount of token already released
     */
    function released(address beneficiary) public view returns (uint256) {
        return _beneficiaryInfo[beneficiary]._allocationReleased;
    }

    /**
     * @dev Setter for adding a beneficiary address.
     */
    function setBeneficiary(address beneficiary, uint256 allocation) external onlyOwner {
        require(beneficiary != address(0), 'Beneficiary: address cannot be zero');
        require(_beneficiaryInfo[beneficiary]._allocationBalance == 0, 'Beneficiary: allocation already set');
        _beneficiaryInfo[beneficiary] = BeneficiaryInfo(allocation, 0);
        _totalAllocationBalance += allocation;
        _beneficiaryAddresses.push(beneficiary);
        emit BeneficiaryAdded(beneficiary, allocation);
    }

    /**
     * @dev Release the tokens that have already vested.
     *
     * Emits a {TokensReleased} event.
     */
    function release(address beneficiary) external {
        uint256 releasable = vestedAmount(beneficiary, uint256(block.timestamp)) - released(beneficiary);
        _beneficiaryInfo[beneficiary]._allocationReleased += releasable;
        _beneficiaryInfo[beneficiary]._allocationBalance -= releasable;
        emit ERC20Released(address(vestedToken), releasable);
        SafeERC20.safeTransfer(IERC20(vestedToken), beneficiary, releasable);
    }

    /**
     * @dev Calculates the amount of WOM tokens that has already vested. Default implementation is a linear vesting curve.
     */
    function vestedAmount(address beneficiary, uint256 timestamp) public returns (uint256) {
        uint256 _vestedAmount = _vestingSchedule(
            _beneficiaryInfo[beneficiary]._allocationBalance + released(beneficiary),
            uint256(timestamp)
        );
        console.log('151');
        console.log(_vestedAmount);
        return _vestedAmount;
    }

    /**
     * @dev implementation of the vesting formula. This returns the amout vested, as a function of time, for
     * an asset given its total historical allocation.
     * 10% of the Total Number of Tokens Purchased shall unlock every 6 months from the Network Launch,
     * with the Total Number * of Tokens Purchased becoming fully unlocked 5 years from the Network Launch.
     * i.e. 6 months cliff from TGE, 10% unlock at month 6, 10% unlock at month 12, and final 10% unlock at month 60
     */
    function _vestingSchedule(uint256 totalAllocation, uint256 timestamp) internal returns (uint256) {
        if (timestamp < start()) {
            console.log('160');
            return 0;
        } else if (timestamp > start() + duration()) {
            console.log('163');
            console.log(totalAllocation);
            return totalAllocation;
        } else if (timestamp == uint256(block.timestamp)) {
            uint256 currentInterval = _calculateInterval(timestamp);
            bool isUnlocked = currentInterval > _unlockIntervalsCount;
            console.log('168');
            console.log(totalAllocation);
            console.log(isUnlocked);
            console.log(_unlockIntervalsCount);
            if (isUnlocked) {
                console.log('173');
                _unlockIntervalsCount = currentInterval;
                console.log(_unlockIntervalsCount);
                uint256 releasableAmount = (totalAllocation * _unlockIntervalsCount * 10) / 100;
                console.log(releasableAmount);
                return releasableAmount;
            }
        } else {
            console.log('183');
            return ((totalAllocation * _calculateInterval(timestamp) * 10) / 100);
        }
    }

    /**
     * @dev Calculates the interval .
     */
    function _calculateInterval(uint256 timestamp) internal view returns (uint256) {
        uint256 timeElapsed = timestamp - start();
        console.log('220');
        console.log(timeElapsed);
        console.log(timeElapsed / _unlockDurationSeconds);
        return timeElapsed / _unlockDurationSeconds;
    }
}
