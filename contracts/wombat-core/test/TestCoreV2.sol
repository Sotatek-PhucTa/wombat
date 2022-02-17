// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.5;

import '../pool/CoreV2.sol';

contract TestCoreV2 is CoreV2 {
    function testSwapQuoteFunc(
        uint256 Ax,
        uint256 Ay,
        uint256 Lx,
        uint256 Ly,
        int256 Dx_i,
        uint256 A
    ) external pure returns (uint256) {
        return _swapQuoteFunc(int256(Ax), int256(Ay), int256(Lx), int256(Ly), Dx_i, int256(A));
    }

    function test_coverageYFunc(int256 b, int256 A) external pure returns (int256) {
        return _solveQuad(b, A);
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
        return _invariantFunc(Lx, SignedSafeMath.wdiv(Ax, Lx), Ly, SignedSafeMath.wdiv(Ay, Ly), A);
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
