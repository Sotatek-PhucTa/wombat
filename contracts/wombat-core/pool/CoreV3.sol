// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import '../interfaces/IAsset.sol';
import '../libraries/DSMath.sol';
import '../libraries/SignedSafeMath.sol';

/**
 * @title CoreV3
 * @notice Handles math operations of Wombat protocol. Assume all params are signed integer with 18 decimals
 * @dev Uses OpenZeppelin's SignedSafeMath and DSMath's WAD for calculations.
 * Change log:
 * - Move view functinos (quotes, high cov ratio fee) from the Pool contract to this contract
 * - Add quote functions for cross chain swaps
 */
library CoreV3 {
    using DSMath for uint256;
    using SignedSafeMath for int256;

    int256 internal constant WAD_I = 10 ** 18;
    uint256 internal constant WAD = 10 ** 18;

    error CORE_UNDERFLOW();
    error CORE_INVALID_VALUE();
    error CORE_INVALID_HIGH_COV_RATIO_FEE();
    error CORE_ZERO_LIQUIDITY();
    error CORE_CASH_NOT_ENOUGH();
    error CORE_COV_RATIO_LIMIT_EXCEEDED();

    /*
     * Public view functions
     */

    /**
     * This function calculate the exactly amount of liquidity of the deposit. Assumes r* = 1
     */
    function quoteDepositLiquidityInEquil(
        IAsset asset,
        uint256 amount,
        uint256 ampFactor
    ) public view returns (uint256 lpTokenToMint, uint256 liabilityToMint, uint256 reward) {
        liabilityToMint = exactDepositLiquidityInEquilImpl(
            int256(amount),
            int256(uint256(asset.cash())),
            int256(uint256(asset.liability())),
            int256(ampFactor)
        ).toUint256();

        if (liabilityToMint >= amount) {
            reward = liabilityToMint - amount;
        } else {
            // rounding error
            liabilityToMint = amount;
        }

        // Calculate amount of LP to mint : ( deposit + reward ) * TotalAssetSupply / Liability
        uint256 liability = asset.liability();
        lpTokenToMint = (liability == 0 ? liabilityToMint : (liabilityToMint * asset.totalSupply()) / liability);
    }

    /**
     * @notice Calculates fee and liability to burn in case of withdrawal
     * @param asset The asset willing to be withdrawn
     * @param liquidity The liquidity willing to be withdrawn
     * @return amount Total amount to be withdrawn from Pool
     * @return liabilityToBurn Total liability to be burned by Pool
     * @return fee
     */
    function quoteWithdrawAmount(
        IAsset asset,
        uint256 liquidity,
        uint256 ampFactor
    ) public view returns (uint256 amount, uint256 liabilityToBurn, uint256 fee) {
        liabilityToBurn = (asset.liability() * liquidity) / asset.totalSupply();
        if (liabilityToBurn == 0) revert CORE_ZERO_LIQUIDITY();

        amount = withdrawalAmountInEquilImpl(
            -int256(liabilityToBurn),
            int256(uint256(asset.cash())),
            int256(uint256(asset.liability())),
            int256(ampFactor)
        ).toUint256();

        if (liabilityToBurn >= amount) {
            fee = liabilityToBurn - amount;
        } else {
            // rounding error
            amount = liabilityToBurn;
        }
    }

    function quoteWithdrawAmountFromOtherAsset(
        IAsset fromAsset,
        IAsset toAsset,
        uint256 liquidity,
        uint256 ampFactor,
        uint256 scaleFactor,
        uint256 haircutRate,
        uint256 startCovRatio,
        uint256 endCovRatio
    ) public view returns (uint256 finalAmount, uint256 withdrewAmount) {
        // quote withdraw
        (withdrewAmount, , ) = quoteWithdrawAmount(fromAsset, liquidity, ampFactor);

        // quote swap
        uint256 fromCash = fromAsset.cash() - withdrewAmount;
        uint256 fromLiability = fromAsset.liability() - liquidity;

        if (scaleFactor != WAD) {
            // apply scale factor on from-amounts
            fromCash = (fromCash * scaleFactor) / 1e18;
            fromLiability = (fromLiability * scaleFactor) / 1e18;
            withdrewAmount = (withdrewAmount * scaleFactor) / 1e18;
        }

        uint256 idealToAmount = swapQuoteFunc(
            int256(fromCash),
            int256(uint256(toAsset.cash())),
            int256(fromLiability),
            int256(uint256(toAsset.liability())),
            int256(withdrewAmount),
            int256(ampFactor)
        );

        // remove haircut
        finalAmount = idealToAmount - idealToAmount.wmul(haircutRate);

        if (startCovRatio > 0 || endCovRatio > 0) {
            // charge high cov ratio fee
            uint256 fee = highCovRatioFee(
                fromCash,
                fromLiability,
                withdrewAmount,
                finalAmount,
                startCovRatio,
                endCovRatio
            );

            finalAmount -= fee;
        }
    }

    /**
     * @notice Quotes the actual amount user would receive in a swap, taking in account slippage and haircut
     * @param fromAsset The initial asset
     * @param toAsset The asset wanted by user
     * @param fromAmount The amount to quote
     * @return actualToAmount The actual amount user would receive
     * @return haircut The haircut that will be applied
     */
    function quoteSwap(
        IAsset fromAsset,
        IAsset toAsset,
        int256 fromAmount,
        uint256 ampFactor,
        uint256 scaleFactor,
        uint256 haircutRate
    ) public view returns (uint256 actualToAmount, uint256 haircut) {
        // exact output swap quote should count haircut before swap
        if (fromAmount < 0) {
            fromAmount = fromAmount.wdiv(WAD_I - int256(haircutRate));
        }

        uint256 fromCash = uint256(fromAsset.cash());
        uint256 fromLiability = uint256(fromAsset.liability());
        uint256 toCash = uint256(toAsset.cash());

        if (scaleFactor != WAD) {
            // apply scale factor on from-amounts
            fromCash = (fromCash * scaleFactor) / 1e18;
            fromLiability = (fromLiability * scaleFactor) / 1e18;
            fromAmount = (fromAmount * int256(scaleFactor)) / 1e18;
        }

        uint256 idealToAmount = swapQuoteFunc(
            int256(fromCash),
            int256(toCash),
            int256(fromLiability),
            int256(uint256(toAsset.liability())),
            fromAmount,
            int256(ampFactor)
        );
        if ((fromAmount > 0 && toCash < idealToAmount) || (fromAmount < 0 && fromAsset.cash() < uint256(-fromAmount))) {
            revert CORE_CASH_NOT_ENOUGH();
        }

        if (fromAmount > 0) {
            // normal quote
            haircut = idealToAmount.wmul(haircutRate);
            actualToAmount = idealToAmount - haircut;
        } else {
            // exact output swap quote count haircut in the fromAmount
            actualToAmount = idealToAmount;
            haircut = (uint256(-fromAmount)).wmul(haircutRate);
        }
    }

    function quoteSwapTokensForCredit(
        IAsset fromAsset,
        uint256 fromAmount,
        uint256 ampFactor,
        uint256 scaleFactor,
        uint256 startCovRatio,
        uint256 endCovRatio
    ) public view returns (uint256 creditAmount, uint256 haircut) {
        uint256 fromCash = fromAsset.cash();
        uint256 fromLiability = fromAsset.liability();

        if (scaleFactor != WAD) {
            // apply scale factor on from-amounts
            fromCash = (fromCash * scaleFactor) / 1e18;
            fromLiability = (fromLiability * scaleFactor) / 1e18;
            fromAmount = (fromAmount * (scaleFactor)) / 1e18;
        }

        creditAmount = swapToCreditQuote(int256(fromCash), int256(fromLiability), int256(fromAmount), int256(ampFactor))
            .toUint256();

        uint256 fee = highCovRatioFee(
            fromAsset.cash(),
            fromAsset.liability(),
            fromAmount,
            creditAmount,
            startCovRatio,
            endCovRatio
        );
        if (fee > 0) {
            creditAmount -= fee;
            haircut += fee;
        }
    }

    function quoteSwapCreditForTokens(
        uint256 fromAmount,
        IAsset toAsset,
        uint256 ampFactor,
        uint256 scaleFactor,
        uint256 haircutRate
    ) public view returns (uint256 actualToAmount, uint256 haircut) {
        uint256 toCash = toAsset.cash();
        uint256 toLiability = toAsset.liability();

        if (scaleFactor != WAD) {
            // apply scale factor on from-amounts
            fromAmount = (fromAmount * scaleFactor) / 1e18;
        }

        uint256 idealToAmount = swapFromCreditQuote(
            int256(toCash),
            int256(toLiability),
            int256(fromAmount),
            int256(ampFactor)
        ).toUint256();
        if (fromAmount > 0 && toCash < idealToAmount) {
            revert CORE_CASH_NOT_ENOUGH();
        }

        if (fromAmount > 0) {
            // normal quote
            haircut = idealToAmount.wmul(haircutRate);
            actualToAmount = idealToAmount - haircut;
        } else {
            // exact output swap quote count haircut in the fromAmount
            actualToAmount = idealToAmount;
            haircut = fromAmount.wmul(haircutRate);
        }
    }

    function equilCovRatio(int256 D, int256 SL, int256 A) public pure returns (int256 er) {
        int256 b = -(D.wdiv(SL));
        er = _solveQuad(b, A);
    }

    /*
     * Pure calculating functions
     */

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
    function swapQuoteFunc(
        int256 Ax,
        int256 Ay,
        int256 Lx,
        int256 Ly,
        int256 Dx,
        int256 A
    ) public pure returns (uint256 quote) {
        if (Lx == 0 || Ly == 0) {
            // in case div of 0
            revert CORE_UNDERFLOW();
        }
        int256 D = Ax + Ay - A.wmul((Lx * Lx) / Ax + (Ly * Ly) / Ay); // flattened _invariantFunc
        int256 rx_ = (Ax + Dx).wdiv(Lx);
        int256 b = (Lx * (rx_ - A.wdiv(rx_))) / Ly - D.wdiv(Ly); // flattened _coefficientFunc
        int256 ry_ = _solveQuad(b, A);
        int256 Dy = Ly.wmul(ry_) - Ay;
        if (Dy < 0) {
            quote = uint256(-Dy);
        } else {
            quote = uint256(Dy);
        }
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
    ) public pure returns (int256 v) {
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
     */
    function withdrawalAmountInEquilImpl(
        int256 delta_i,
        int256 A_i,
        int256 L_i,
        int256 A
    ) public pure returns (int256 amount) {
        int256 L_i_ = L_i + delta_i;
        int256 r_i = A_i.wdiv(L_i);
        int256 rho = L_i.wmul(r_i - A.wdiv(r_i));
        int256 beta = (rho + delta_i.wmul(WAD_I - A)) / 2;
        int256 A_i_ = beta + (beta * beta + A.wmul(L_i_ * L_i_)).sqrt(beta);
        amount = A_i - A_i_;
    }

    /**
     * @notice return the deposit reward in token amount when target liquidity (LP amount) is known
     */
    function exactDepositLiquidityInEquilImpl(
        int256 D_i,
        int256 A_i,
        int256 L_i,
        int256 A
    ) public pure returns (int256 liquidity) {
        if (L_i == 0) {
            // if this is a deposit, there is no reward/fee
            // if this is a withdrawal, it should have been reverted
            return D_i;
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
        return (-b + l.sqrt(b)).wdiv(A) / 2;
    }

    function swapToCreditQuote(int256 Ax, int256 Lx, int256 Dx, int256 A) public pure returns (int256 quote) {
        int256 rx = Ax.wdiv(Lx);
        int256 rx_ = (Ax + Dx).wdiv(Lx);
        int256 x = rx_ - A.wdiv(rx_);
        int256 y = rx - A.wdiv(rx);

        // return Lx.wmul(x - y);
        return (Lx * (x - y)) / (WAD_I + A);
    }

    function swapFromCreditQuote(
        int256 Ax,
        int256 Lx,
        int256 delta_credit,
        int256 A
    ) public pure returns (int256 quote) {
        int256 rx = Ax.wdiv(Lx);
        // int256 b = delta_credit.wdiv(Lx) - rx + A.wdiv(rx); // flattened _coefficientFunc
        int256 b = (delta_credit * (WAD_I + A)) / Lx - rx + A.wdiv(rx); // flattened _coefficientFunc
        int256 rx_ = _solveQuad(b, A);
        int256 Dx = Ax - Lx.wmul(rx_);

        return Dx;
    }

    function highCovRatioFee(
        uint256 fromAssetCash,
        uint256 fromAssetLiability,
        uint256 fromAmount,
        uint256 quotedToAmount,
        uint256 startCovRatio,
        uint256 endCovRatio
    ) public pure returns (uint256 fee) {
        uint256 finalFromAssetCovRatio = (fromAssetCash + fromAmount).wdiv(fromAssetLiability);

        if (finalFromAssetCovRatio > startCovRatio) {
            // charge high cov ratio fee
            uint256 feeRatio = _highCovRatioFee(
                fromAssetCash.wdiv(fromAssetLiability),
                finalFromAssetCovRatio,
                startCovRatio,
                endCovRatio
            );

            if (feeRatio > WAD) revert CORE_INVALID_HIGH_COV_RATIO_FEE();
            fee = feeRatio.wmul(quotedToAmount);
        }
    }

    /*
     * Internal functions
     */

    /**
     * @notice Solve quadratic equation
     * @dev This function always returns >= 0
     * @param b quadratic equation b coefficient
     * @param c quadratic equation c coefficient
     * @return x
     */
    function _solveQuad(int256 b, int256 c) internal pure returns (int256) {
        return (((b * b) + (c * 4 * WAD_I)).sqrt(b) - b) / 2;
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
    function _invariantFunc(int256 Lx, int256 rx, int256 Ly, int256 ry, int256 A) internal pure returns (int256) {
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
    function _coefficientFunc(int256 Lx, int256 Ly, int256 rx_, int256 D, int256 A) internal pure returns (int256) {
        return Lx.wmul(rx_ - A.wdiv(rx_)).wdiv(Ly) - D.wdiv(Ly);
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
        int256 er = equilCovRatio(D, SL, A);
        int256 er_ = _newEquilCovRatio(er, SL, delta_i);
        int256 D_ = _newInvariantFunc(er_, A, SL, delta_i);

        // Summation of k∈T\{i} is D - L_i.wmul(r_i - A.wdiv(r_i))
        int256 b_ = (D - A_i + (L_i * A) / r_i - D_).wdiv(L_i + delta_i);
        r_i_ = _solveQuad(b_, A);
    }

    function _newEquilCovRatio(int256 er, int256 SL, int256 delta_i) internal pure returns (int256 er_) {
        er_ = (delta_i + SL.wmul(er)).wdiv(delta_i + SL);
    }

    function _newInvariantFunc(int256 er_, int256 A, int256 SL, int256 delta_i) internal pure returns (int256 D_) {
        D_ = (SL + delta_i).wmul(er_ - A.wdiv(er_));
    }

    /**
     * @notice Calculate the high cov ratio fee in the to-asset in a swap.
     * @dev When cov ratio is in the range [startCovRatio, endCovRatio], the marginal cov ratio is
     * (r - startCovRatio) / (endCovRatio - startCovRatio). Here we approximate the high cov ratio cut
     * by calculating the "average" fee.
     * Note: `finalCovRatio` should be greater than `initCovRatio`
     */
    function _highCovRatioFee(
        uint256 initCovRatio,
        uint256 finalCovRatio,
        uint256 startCovRatio,
        uint256 endCovRatio
    ) internal pure returns (uint256 fee) {
        if (finalCovRatio > endCovRatio) {
            // invalid swap
            revert CORE_COV_RATIO_LIMIT_EXCEEDED();
        } else if (finalCovRatio <= startCovRatio || finalCovRatio <= initCovRatio) {
            return 0;
        }

        // 1. Calculate the area of fee(r) = (r - startCovRatio) / (endCovRatio - startCovRatio)
        // when r increase from initCovRatio to finalCovRatio
        // 2. Then multiply it by (endCovRatio - startCovRatio) / (finalCovRatio - initCovRatio)
        // to get the average fee over the range
        uint256 a = initCovRatio <= startCovRatio ? 0 : (initCovRatio - startCovRatio) * (initCovRatio - startCovRatio);
        uint256 b = (finalCovRatio - startCovRatio) * (finalCovRatio - startCovRatio);
        fee = ((b - a) / (finalCovRatio - initCovRatio) / 2).wdiv(endCovRatio - startCovRatio);
    }
}
