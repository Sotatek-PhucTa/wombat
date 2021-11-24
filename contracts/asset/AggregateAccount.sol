// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.5;

import '@openzeppelin/contracts/access/Ownable.sol';
import 'hardhat/console.sol';

/**
 * @title AggregateAccount
 * @notice AggregateAccount represents groups of assets
 * @dev Aggregate Account needs to be set for Asset
 */
contract AggregateAccount is Ownable {
    /// @notice name of the account. E.g USD for aggregate account containing BUSD, USDC, USDT, etc.
    string public accountName;

    /// @notice true if the assets represented by the aggregate are stablecoins
    /// @dev will be needed for interpool swapping
    bool public isStable;

    /**
     * @notice Constructor.
     * @param accountName_ The name of the aggregate account
     * @param isStable_ Tells if this aggregate holds stable assets or not
     */
    constructor(string memory accountName_, bool isStable_) {
        accountName = accountName_;
        isStable = isStable_;
    }

    /**
     * @notice Changes Account Name. Can only be set by the contract owner.
     * @param accountName_ the new name
     */
    function setAccountName(string memory accountName_) external onlyOwner {
        // console.log("accountName_ log: '%s'", accountName_);
        // console.log("accountName_ log:", bytes(accountName_).length);
        require(bytes(accountName_).length > 0, 'Wombat: Aggregate account name cannot be zero');
        accountName = accountName_;
    }
}
