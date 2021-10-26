// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.5;

import '../libraries/DSMath.sol';

/**
 * @title Core
 * @notice Handles math operations of Wombat protocol.
 * @dev Uses DSMath to compute using WAD and RAY.
 */
contract Core {
    using DSMath for uint256;

    /// @notice WAD unit. Used to handle most numbers.
    uint256 internal constant WAD = 10**18;

    /// @notice RAY unit. Used for rpow function.
    uint256 internal constant RAY = 10**27;

    function _slippageFunc(
        uint256 k,
        uint256 n,
        uint256 c1,
        uint256 xThreshold,
        uint256 x
    ) internal pure returns (uint256) {
        return 0;
    }

    function _slippage(
        uint256 k,
        uint256 n,
        uint256 c1,
        uint256 xThreshold,
        uint256 cash,
        uint256 liability,
        uint256 cashChange,
        bool addCash
    ) internal pure returns (uint256) {
        return 0;
    }

    function _swappingSlippage(uint256 si, uint256 sj) internal pure returns (uint256) {}

    function _haircut(uint256 amount, uint256 rate) internal pure returns (uint256) {
        return 0;
    }

    function _dividend(uint256 amount, uint256 ratio) internal pure returns (uint256) {
        return 0;
    }

    function _withdrawalFee(
        uint256 k,
        uint256 n,
        uint256 c1,
        uint256 xThreshold,
        uint256 cash,
        uint256 liability,
        uint256 amount
    ) internal pure returns (uint256) {
        return 0;
    }

    function _depositFee(
        uint256 k,
        uint256 n,
        uint256 c1,
        uint256 xThreshold,
        uint256 cash,
        uint256 liability,
        uint256 amount
    ) internal pure returns (uint256) {
        return 0;
    }
}
