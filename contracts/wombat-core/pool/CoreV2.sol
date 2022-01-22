// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.5;

import '../libraries/DSMath.sol';
import '../libraries/SignedSafeMath.sol';
import '../libraries/SafeCast.sol';

/**
 * @title CoreV2
 * @notice Handles math operations of Wombat protocol.
 * @dev Uses OpenZeppelin's SignedSafeMath and DSMath's WAD for calculations.
 */
contract CoreV2 {
    using DSMath for uint256;
    using SignedSafeMath for int256;
    int256 public constant WAD_i = 10**18;
    uint256 public constant WAD = 10**18;

    /**
     * @notice Core Wombat stableswap equation
     * @dev This function always returns >= 0
     * @param Ax asset of token x
     * @param Ay asset of token y
     * @param Lx liability of token x
     * @param Ly liability of token y
     * @param Dx delta x, i.e. token x amount inputted
     * @param A amplification factor
     * @return The quote for amount of token y swapped for token x amount inputted
     */
    function _swapQuoteFunc(
        uint256 Ax,
        uint256 Ay,
        uint256 Lx,
        uint256 Ly,
        uint256 Dx,
        uint256 A
    ) internal pure returns (uint256) {
        int256 Ax_i = SafeCast.toInt256(Ax);
        int256 Ay_i = SafeCast.toInt256(Ay);
        int256 Lx_i = SafeCast.toInt256(Lx);
        int256 Ly_i = SafeCast.toInt256(Ly);
        int256 Dx_i = SafeCast.toInt256(Dx);
        int256 A_i = SafeCast.toInt256(A);

        int256 Rx = _coverageXFunc(Ax_i, Lx_i, Dx_i);
        int256 D = _invariantFunc(Ax_i, Ay_i, Lx_i, Ly_i, A_i);
        int256 b = _coefficientFunc(Lx_i, Ly_i, Rx, D, A_i);
        int256 Ry = _coverageYFunc(b, A_i);
        int256 Dy = _deltaFunc(Ay_i, Ly_i, Ry);
        int256 quote_i = Ay_i.sub(Ay_i.add(Dy));
        uint256 quote = SafeCast.toUint256(quote_i);
        return quote;
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
        int256 sqrtR = ((b**2).add(A * 4 * WAD_i));
        int256 sqrtResult = sqrtR.sqrt();
        int256 numerator = sqrtResult.sub(b);
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
     * @notice Equation to get invariant constant between token x and token y
     * @dev This function always returns >= 0
     * @param Ax asset of token x
     * @param Ay asset of token y
     * @param Lx liability of token x
     * @param Ly liability of token y
     * @param A amplification factor
     * @return The invariant constant between token x and token y ("D")
     */
    function _invariantFunc(
        int256 Ax,
        int256 Ay,
        int256 Lx,
        int256 Ly,
        int256 A
    ) internal pure returns (int256) {
        int256 Rx_0 = Ax.wdiv(Lx);
        int256 Ry_0 = Ay.wdiv(Ly);
        int256 a = Lx.wmul(Rx_0).add(Ly.wmul(Ry_0));
        int256 b = A.wmul(Lx.wdiv(Rx_0).add(Ly.wdiv(Ry_0)));
        return a.sub(b);
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
        return (a.wmul(b)).sub(c);
    }

    /**
     * @return w positive value indicates a reward and negative value indicates a fee
     */
    function depositRewardImpl(
        int256 SL,
        int256 delta_i,
        int256 A_i,
        int256 L_i,
        int256 D,
        int256 A
    ) internal pure returns (int256 w) {
        if (SL == 0 || L_i == 0 || L_i + delta_i == 0) {
            return 0;
        }

        int256 r_i_ = _targetedCovRatio(SL, delta_i, A_i, L_i, D, A);
        w = (L_i.wmul(A_i).wdiv(L_i) + delta_i) - (L_i + delta_i).wmul(r_i_);
    }

    function _targetedCovRatio(
        int256 SL,
        int256 delta_i,
        int256 A_i,
        int256 L_i,
        int256 D,
        int256 A
    ) internal pure returns (int256 r_i_) {
        int256 r_i = A_i.wdiv(L_i);
        int256 er = _equilCovRatio(D, SL, A);
        int256 er_ = _newEquilCovRatio(er, SL, delta_i);
        int256 D_ = _newInvariantFunc(er_, A, SL, delta_i);

        int256 b_ = (D - D_ - L_i.wmul(r_i - A.wdiv(r_i))).wdiv(L_i + delta_i);
        r_i_ = _coverageYFunc(b_, A);
        // console.log('b_', uint256(-b_ / 1e18), '.', (uint256(-b_) % 1e18) / 1e12);
        // console.log('r_i_', uint256(r_i_));
    }

    function _equilCovRatio(
        int256 D,
        int256 SL,
        int256 A
    ) internal pure returns (int256 er) {
        int256 b = -(D.wdiv(SL));
        er = _coverageYFunc(b, A);
        // console.log('b', uint256(-b / 1e18), '.', (uint256(-b) % 1e18) / 1e12);
        // console.log('er', uint256(er / 1e18), '.', (uint256(er) % 1e18) / 1e12);
    }

    function _newEquilCovRatio(
        int256 er,
        int256 SL,
        int256 delta_i
    ) internal pure returns (int256 er_) {
        er_ = (delta_i + SL.wmul(er)).wdiv(delta_i + SL);
        // console.log('er_', uint256(er_ / 1e18), '.', (uint256(er_) % 1e18) / 1e12);
    }

    function _newInvariantFunc(
        int256 er_,
        int256 A,
        int256 SL,
        int256 amount
    ) internal pure returns (int256 D_) {
        D_ = (SL + amount).wmul(er_ - A.wdiv(er_));
        // console.log('D_', uint256(D_) / 1e18);
    }

    /**
     * @notice Equation to convert token amount to WAD units, i.e. decimal number with 18 digits
     * @dev Converts amount to WAD units
     * @param d decimal of token x
     * @param Dx delta x, i.e. token x amount inputted
     * @return The token amount in WAD units
     */
    function _convertToWAD(uint8 d, uint256 Dx) internal pure returns (uint256) {
        if (d < 18) {
            return Dx * 10**(18 - d);
        } else if (d > 18) {
            return (Dx / (10**(d - 18)));
        }
        return Dx;
    }

    /**
     * @notice Equation to convert WAD units back to original token amount with correct decimal numbers
     * @dev Converts WAD units to original amount
     * @param d decimal of token x
     * @param Dx delta x, i.e. token x amount inputted
     * @return The original token amount with correct decimals
     */
    function _convertFromWAD(uint8 d, uint256 Dx) internal pure returns (uint256) {
        if (d < 18) {
            return (Dx / (10**(18 - d)));
        } else if (d > 18) {
            return Dx * 10**(d - 18);
        }
        return Dx;
    }

    /**
     * TODO BELOW
     */

    /**
     * @notice TODO (if any) from Yellow Paper (Haircut).
     * @dev Applies haircut rate to amount
     * @param amount The amount that will receive the discount
     * @param rate The rate to be applied
     * @return The result of operation.
     */
    function _haircut(uint256 amount, uint256 rate) internal pure returns (uint256) {
        return amount.wmul(rate);
    }

    /**
     * @notice TODO (if any) Applies dividend to amount
     * @param amount The amount that will receive the discount
     * @param ratio The ratio to be applied in dividend
     * @return The result of operation.
     */
    function _dividend(uint256 amount, uint256 ratio) internal pure returns (uint256) {
        return amount.wmul(WAD - ratio);
    }
}
