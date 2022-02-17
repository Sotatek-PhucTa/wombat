// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.5;

import '../libraries/DSMath.sol';
import '../libraries/SignedSafeMath.sol';

/**
 * @title CoreV2
 * @notice Handles math operations of Wombat protocol. Assume all params are signed integer with 18 decimals
 * @dev Uses OpenZeppelin's SignedSafeMath and DSMath's WAD for calculations.
 */
contract CoreV2 {
    using DSMath for uint256;
    using SignedSafeMath for int256;
    int256 public constant WAD_I = 10**18;
    uint256 public constant WAD = 10**18;

    error CORE_UNDERFLOW();

    /**
     * @notice Core Wombat stableswap equation
     * @dev This function always returns >= 0
     * @param Ax asset of token x
     * @param Ay asset of token y
     * @param Lx liability of token x
     * @param Ly liability of token y
     * @param Dx delta x, i.e. token x amount inputted
     * @param A amplification factor
     * @return quote The quote for amount of token y swapped for token x amount inputted
     */
    function _swapQuoteFunc(
        int256 Ax,
        int256 Ay,
        int256 Lx,
        int256 Ly,
        int256 Dx,
        int256 A
    ) internal pure returns (uint256 quote) {
        int256 D = _invariantFunc(Lx, Ax.wdiv(Lx), Ly, Ay.wdiv(Ly), A);
        int256 rx_ = (Ax + Dx).wdiv(Lx);
        int256 b = _coefficientFunc(Lx, Ly, rx_, D, A);
        int256 ry_ = _solveQuad(b, A);
        int256 Dy = Ly.wmul(ry_) - Ay;
        if (Dy < 0) {
            quote = uint256(-Dy);
        } else {
            quote = uint256(Dy);
        }
    }

    /**
     * @notice Solve quadratic equation
     * @dev This function always returns >= 0
     * @param b quadratic equation b coefficient
     * @param c quadratic equation c coefficient
     * @return x
     */
    function _solveQuad(int256 b, int256 c) internal pure returns (int256) {
        int256 sqrtResult = ((b * b) + (c * 4 * WAD_I)).sqrt();
        return (sqrtResult - b) / 2;
    }

    /**
     * @notice Equation to get invariant constant between token x and token y
     * @dev This function always returns >= 0
     * @param Lx liability of token x
     * @param rx cov ratio of token x
     * @param Ly liability of token x
     * @param ry cov ratio of token y
     * @param A amplification factor
     * @return The invariant constant between token x and token y ("D")
     */
    function _invariantFunc(
        int256 Lx,
        int256 rx,
        int256 Ly,
        int256 ry,
        int256 A
    ) internal pure returns (int256) {
        int256 a = Lx.wmul(rx) + Ly.wmul(ry);
        int256 b = A.wmul(Lx.wdiv(rx) + Ly.wdiv(ry));
        return a - b;
    }

    /**
     * @notice Equation to get quadratic equation b coefficient
     * @dev This function can return >= 0 or <= 0
     * @param Lx liability of token x
     * @param Ly liability of token y
     * @param rx_ new asset coverage ratio of token x
     * @param D invariant constant
     * @param A amplification factor
     * @return The quadratic equation b coefficient ("b")
     */
    function _coefficientFunc(
        int256 Lx,
        int256 Ly,
        int256 rx_,
        int256 D,
        int256 A
    ) internal pure returns (int256) {
        return Lx.wmul(rx_ - A.wdiv(rx_)).wdiv(Ly) - D.wdiv(Ly);
    }

    /**
     * @return v positive value indicates a reward and negative value indicates a fee
     */
    function depositRewardImpl(
        int256 D,
        int256 SL,
        int256 delta_i,
        int256 A_i,
        int256 L_i,
        int256 A
    ) internal pure returns (int256 v) {
        if (L_i == 0) {
            // early return in case of div of 0
            return 0;
        }
        if (delta_i + SL == 0) {
            return L_i - A_i;
        }

        int256 r_i_ = _targetedCovRatio(SL, delta_i, A_i, L_i, D, A);
        v = A_i + delta_i - (L_i + delta_i).wmul(r_i_);
    }

    /**
     * @dev should be used only when r* = 1
     * @return v positive value indicates a reward and negative value indicates a fee
     */
    function depositRewardInEquilImpl(
        int256 delta_i,
        int256 A_i,
        int256 L_i,
        int256 A
    ) internal pure returns (int256 v) {
        if (L_i == 0) {
            // early return in case of div of 0
            return 0;
        }

        int256 L_i_ = L_i + delta_i;
        int256 r_i = A_i.wdiv(L_i);
        int256 rho = L_i.wmul(r_i - A.wdiv(r_i));
        int256 beta = (rho + delta_i.wmul(WAD_I - A)) / 2;
        int256 A_i_ = beta + (beta * beta + A.wmul(L_i_ * L_i_)).sqrt();
        v = delta_i + A_i - A_i_;
    }

    /**
     * @notice return the deposit reward in token amount when target liquidity (LP amount) is known
     */
    function exactDepositRewardInEquilImpl(
        int256 D_i,
        int256 A_i,
        int256 L_i,
        int256 A
    ) internal pure returns (int256 v) {
        if (L_i == 0) {
            // if this is a deposit, there is no reward/fee
            // if this is a withdrawal, it should have been reverted
            return 0;
        }
        if (A_i + D_i < 0) {
            // impossible
            revert CORE_UNDERFLOW();
        }

        int256 r_i = A_i.wdiv(L_i);
        int256 k = D_i + A_i;
        int256 b = k.wmul(WAD_I - A) + 2 * A.wmul(L_i);
        int256 c = k.wmul(A_i - (A * L_i) / r_i) - k.wmul(k) + A.wmul(L_i).wmul(L_i);
        int256 l = b * b - 4 * A * c;
        return (-b + (l).sqrt()).wdiv(A) / 2 - D_i;
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

        // Summation of k∈T\{i} is D - L_i.wmul(r_i - A.wdiv(r_i))
        int256 b_ = (D - A_i + (L_i * A) / r_i - D_).wdiv(L_i + delta_i);
        r_i_ = _solveQuad(b_, A);
    }

    function _equilCovRatio(
        int256 D,
        int256 SL,
        int256 A
    ) internal pure returns (int256 er) {
        int256 b = -(D.wdiv(SL));
        er = _solveQuad(b, A);
    }

    function _newEquilCovRatio(
        int256 er,
        int256 SL,
        int256 delta_i
    ) internal pure returns (int256 er_) {
        er_ = (delta_i + SL.wmul(er)).wdiv(delta_i + SL);
    }

    function _newInvariantFunc(
        int256 er_,
        int256 A,
        int256 SL,
        int256 delta_i
    ) internal pure returns (int256 D_) {
        D_ = (SL + delta_i).wmul(er_ - A.wdiv(er_));
    }

    /**
     * @notice Equation to convert token amount to WAD units, i.e. decimal number with 18 digits
     * @dev Converts amount to WAD units
     * @param d decimal of token x
     * @param Dx delta x, i.e. token x amount inputted
     * @return The token amount in WAD units
     */
    function _convertToWAD(uint256 d, uint256 Dx) internal pure returns (uint256) {
        if (d < 18) {
            return Dx * 10**(18 - d);
        } else if (d > 18) {
            return (Dx / (10**(d - 18)));
        }
        return Dx;
    }

    /**
     * For signed integer
     */
    function _convertToWAD(uint256 d, int256 Dx) internal pure returns (int256) {
        if (d < 18) {
            return Dx * int256(10**(18 - d));
        } else if (d > 18) {
            return (Dx / int256(10**(d - 18)));
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
    function _convertFromWAD(uint256 d, uint256 Dx) internal pure returns (uint256) {
        if (d < 18) {
            return (Dx / (10**(18 - d)));
        } else if (d > 18) {
            return Dx * 10**(d - 18);
        }
        return Dx;
    }

    /**
     * For signed integer
     */
    function _convertFromWAD(uint256 d, int256 Dx) internal pure returns (int256) {
        if (d < 18) {
            return (Dx / int256(10**(18 - d)));
        } else if (d > 18) {
            return Dx * int256(10**(d - 18));
        }
        return Dx;
    }

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
}
