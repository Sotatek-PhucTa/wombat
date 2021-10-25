// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import '../libraries/SignedSafeMath.sol';
import 'hardhat/console.sol';

/**
 * @title CoreV2
 * @notice Handles math operations of Wombat protocol.
 * @dev Uses OpenZeppelin's SignedSafeMath and DSMath's WAD for calculations.
 */
contract CoreV2 {
    using SignedSafeMath for int256;
    int256 public constant WAD = 10**18;

    /**
     * @notice Core Wombat stableswap equation
     * @dev This function always returns >= 0
     * @param Ax asset of token x
     * @param Ay asset of token y
     * @param Lx liability of token x
     * @param Ly liability of token y
     * @param D invariant constant
     * @param Dx delta x, i.e. token x amount inputted
     * @param A amplification factor
     * @return The quote for amount of token y swapped for token x amount inputted
     */
    function swapQuoteFunc(
        int256 Ax,
        int256 Ay,
        int256 Lx,
        int256 Ly,
        int256 D,
        int256 Dx,
        int256 A
    ) public pure returns (int256) {
        int256 Rx = _coverageXFunc(Ax, Lx, Dx);
        int256 b = _coefficientFunc(Lx, Ly, Rx, D, A);
        int256 Ry = _coverageYFunc(b, A);
        int256 Dy = _deltaFunc(Ay, Ly, Ry);
        return _swapQuoteFunc(Dy, Ay);
    }

    /**
     * @notice Euqation to get swap quote
     * @dev This function always returns >= 0
     * @param Ay total asset of token y
     * @param Dy delta for token y
     * @return The quote for amount of token y swapped for token x amount inputted
     */
    function _swapQuoteFunc(int256 Dy, int256 Ay) internal pure returns (int256) {
        return Ay.sub(Ay.add(Dy));
    }

    /**
     * @notice Equation to get delta for token y
     * @dev This function always returns <= 0
     * @param Ay asset of token y
     * @param Ly liability of token y
     * @param Ry asset coverage ratio of token y
     * @return The delta for token y ("Dy") based on its asset coverage ratio
     */
    function _deltaFunc(
        int256 Ay,
        int256 Ly,
        int256 Ry
    ) internal pure returns (int256) {
        return Ly.wmul(Ry).sub(Ay);
    }

    /**
     * @notice Quadratic equation to get asset coverage ratio of token y
     * @dev This function always returns >= 0
     * @param b quadratic equation b coefficient
     * @param A amplification factor
     * @return The asset coverage ratio of token y ("Ry")
     */
    function _coverageYFunc(int256 b, int256 A) internal pure returns (int256) {
        // console.log("_coverageYFunc log: '%s'", 'hello');
        int256 sqrtR = ((b ** 2).add(A * 4 * WAD));
        // console.logInt(sqrtR);
        int256 sqrtResult = sqrtR.sqrt();
        // console.logInt(sqrtResult);
        int256 numerator = sqrtResult.sub(b);
        // console.logInt(numerator);
        return numerator.div(2);
    }

    /**
     * @notice Quadratic equation to get asset coverage ratio of token x
     * @dev This function always returns >= 0
     * @param Ax asset of token x
     * @param Lx liability of token x
     * @param Dx delta x, i.e. token x amount inputted
     * @return The asset coverage ratio of token x ("Rx")
     */
    function _coverageXFunc(
        int256 Ax,
        int256 Lx,
        int256 Dx
    ) internal pure returns (int256) {
        return (Ax.add(Dx)).wdiv(Lx);
    }

    /**
     * @notice Equation to get quadratic equation b coefficient
     * @dev This function can return >= 0 or <= 0
     * @param Lx liability of token x
     * @param Ly liability of token y
     * @param Rx asset coverage ratio of token x
     * @param D invariant constant
     * @param A amplification factor
     * @return The quadratic equation b coefficient ("b")
     */
    function _coefficientFunc(
        int256 Lx,
        int256 Ly,
        int256 Rx,
        int256 D,
        int256 A
    ) internal pure returns (int256) {
        int256 a = Lx.wdiv(Ly);
        int256 b = Rx.sub(A.wdiv(Rx));
        int256 c = D.wdiv(Ly);
        // console.log("coefficientFunc log: '%s'", 'hello');
        // console.logInt(a);
        // console.logInt(b);
        // console.logInt(c);
        return (a.wmul(b)).sub(c);
    }
}
