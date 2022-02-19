// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts v4.3.2 (utils/math/SignedSafeMath.sol)

pragma solidity 0.8.5;

/**
 * @dev Wrappers over Solidity's arithmetic operations.
 *
 * NOTE: `SignedSafeMath` is no longer needed starting with Solidity 0.8. The compiler
 * now has built in overflow checking.
 */
library SignedSafeMath {
    int256 public constant WAD = 10**18;

    //rounds to zero if x*y < WAD / 2
    function wdiv(int256 x, int256 y) internal pure returns (int256) {
        return ((x * WAD) + (y / 2)) / y;
    }

    //rounds to zero if x*y < WAD / 2
    function wmul(int256 x, int256 y) internal pure returns (int256) {
        return ((x * y) + (WAD / 2)) / WAD;
    }

    // Babylonian Method (typecast as int)
    function sqrt(int256 y) internal pure returns (int256 z) {
        if (y > 3) {
            z = y;
            int256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    // Convert x to WAD (18 decimals) from d decimals.
    function toWad(int256 x, uint8 d) internal pure returns (int256) {
        if (d < 18) {
            return x * int256(10**(18 - d));
        } else if (d > 18) {
            return (x / int256(10**(d - 18)));
        }
        return x;
    }

    // Convert x from WAD (18 decimals) to d decimals.
    function fromWad(int256 x, uint8 d) internal pure returns (int256) {
        if (d < 18) {
            return (x / int256(10**(18 - d)));
        } else if (d > 18) {
            return x * int256(10**(d - 18));
        }
        return x;
    }
}
