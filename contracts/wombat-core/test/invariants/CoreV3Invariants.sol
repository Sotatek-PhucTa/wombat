// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import '@openzeppelin/contracts/utils/Strings.sol';
import '@openzeppelin/contracts/utils/math/SignedMath.sol';
import '../../pool/CoreV3.sol';

contract CoreV3Invariant {
    // Check that exactDepositLiquidityImpl return the same value as exactDepositLiquidityInEquilImpl when r* = 1.
    function testGeneralDeposit(
        uint256 margin,
        int256 amount,
        int256 cash,
        int256 liability,
        int256 ampFactor
    ) public pure {
        int256 expected = CoreV3.exactDepositLiquidityInEquilImpl(amount, cash, liability, ampFactor);
        int256 actual = CoreV3.exactDepositLiquidityImpl(amount, cash, liability, ampFactor, 1 ether);
        require(
            SignedMath.abs(expected - actual) <= margin,
            string(
                abi.encodePacked(
                    'expected: ',
                    Strings.toString(uint256(expected)),
                    ' but got: ',
                    Strings.toString(uint256(actual))
                )
            )
        );
    }

    // Check that withdrawalAmountImpl return the same value as withdrawalAmountInEquilImpl when r* = 1.
    function testGeneralWithdraw(
        uint256 margin,
        int256 amount,
        int256 cash,
        int256 liability,
        int256 ampFactor
    ) public pure {
        int256 expected = CoreV3.withdrawalAmountInEquilImpl(amount, cash, liability, ampFactor);
        int256 actual = CoreV3.withdrawalAmountImpl(amount, cash, liability, ampFactor, 1 ether);
        require(
            SignedMath.abs(expected - actual) <= margin,
            string(
                abi.encodePacked(
                    'expected: ',
                    Strings.toString(uint256(expected)),
                    ' but got: ',
                    Strings.toString(uint256(actual))
                )
            )
        );
    }
}
