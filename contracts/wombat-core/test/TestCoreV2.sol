// DO NOT DEPLOY TO MAINNET
// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.5;

import '../pool/CoreV2.sol';

contract TestCoreV2 is CoreV2 {
    function testSwapQuoteFunc(
        uint256 Ax,
        uint256 Ay,
        uint256 Lx,
        uint256 Ly,
        uint256 Dx,
        uint256 A
    ) external pure returns (uint256) {
        return _swapQuoteFunc(Ax, Ay, Lx, Ly, Dx, A);
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

    function test_invariantFunc(
        int256 Ax,
        int256 Ay,
        int256 Lx,
        int256 Ly,
        int256 A
    ) external pure returns (int256) {
        return _invariantFunc(Ax, Ay, Lx, Ly, A);
    }

    function test_depositFee(
        uint256 cash,
        uint256 liability,
        uint256 amount
    ) external pure returns (uint256) {
        return 0;
    }

    function test_convertToWAD(uint8 d, uint256 Dx) external pure returns (uint256) {
        return _convertToWAD(d, Dx);
    }

    function test_convertFromWAD(uint8 d, uint256 Dx) external pure returns (uint256) {
        return _convertFromWAD(d, Dx);
    }
}
