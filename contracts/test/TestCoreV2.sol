// DO NOT DEPLOY TO MAINNET
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import '../pool/CoreV2.sol';

contract TestCoreV2 is CoreV2 {
    function testSwapQuoteFunc(
        int256 Ax,
        int256 Ay,
        int256 Lx,
        int256 Ly,
        int256 D,
        int256 Dx,
        int256 A
    ) public pure returns (int256) {
        return swapQuoteFunc(Ax, Ay, Lx, Ly, D, Dx, A);
    }

    function test_swapQuoteFunc(
        int256 Dy,
        int256 Ay
    ) external pure returns (int256) {
        return _swapQuoteFunc(Dy, Ay);
    }

    function test_deltaFunc(
        int256 Ay,
        int256 Ly,
        int256 Ry
    ) external pure returns (int256) {
        return _deltaFunc(Ay, Ly, Ry);
    }

    function test_coverageYFunc(int256 b, int256 A) external pure returns (int256) {
        return _coverageYFunc(b, A);
    }

    function test_coverageXFunc(
        int256 Ax,
        int256 Lx,
        int256 Dx
    ) external pure returns (int256) {
        return _coverageXFunc(Ax, Lx, Dx);
    }

    function test_coefficientFunc(
        int256 Lx,
        int256 Ly,
        int256 Rx,
        int256 D,
        int256 A
    ) external pure returns (int256) {
        return _coefficientFunc(Lx, Ly, Rx, D, A);
    }

}
