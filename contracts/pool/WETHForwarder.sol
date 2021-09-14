// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.5;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Address.sol';

import '../interfaces/IWETH.sol';

/**
 * @title WETHForwarder
 * @notice Temporary WETH holder and is responsible to unwrap and forward actual ETH to user
 * @dev Allows transfer of WETH avoiding out-of-gas error (in case pool is ever deployed through proxy).
 */
contract WETHForwarder is Ownable, ReentrancyGuard {
    using Address for address payable;

    /// @notice Weth (or BSC in our case) address
    address private _weth;

    /// @notice Pool address
    address private _pool;

    /// @dev Modifier ensuring that certain function can only be called by pool
    modifier onlyPool() {
        require(msg.sender == _pool, 'Wombat: FORBIDDEN');
        _;
    }

    /**
     * @notice Constructor.
     * @param weth The weth (or BSC) address to be used.
     */
    constructor(address weth) {
        require(weth != address(0), 'weth address cannot be zero');
        _weth = weth;
    }

    receive() external payable {
        assert(msg.sender == _weth); // only accept ETH via fallback from the WETH contract
    }

    /**
     * @notice Changes the pool. Can only be set by the contract owner.
     * @param pool new contract pool address
     */
    function setPool(address pool) external onlyOwner {
        require(pool != address(0), 'Pool address cannot be zero');
        _pool = pool;
    }

    /**
     * @notice Unwrap and transfer eth. Can only be called by pool
     * @param to address receiving
     * @param amount total amount to be transferred
     */
    function unwrapAndTransfer(address payable to, uint256 amount) external onlyPool nonReentrant {
        IWETH weth = IWETH(_weth);
        require(weth.balanceOf(address(this)) >= amount, 'Wombat: INSUFFICIENT_WETH');
        weth.withdraw(amount);
        to.sendValue(amount);
    }
}
