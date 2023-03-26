// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.14;

import './DynamicPoolV3.sol';

/**
 * @title Volatile Pool
 * @notice Manages deposits, withdrawals and swaps for volatile pool with external oracle
 */
contract VolatilePool is DynamicPoolV3 {
    function _getGlobalEquilCovRatioForDepositWithdrawal() internal view override returns (int256 equilCovRatio) {
        (equilCovRatio, ) = globalEquilCovRatio();
    }

    // TODO: override `withdraw` to charge withdrawal fees
}
