// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

import '../interfaces/IPool.sol';
import '../interfaces/IWombatRouter.sol';

/**
 * @title WombatRouter
 * @notice Allows routing on different wombat pools
 * @dev Owner is allowed and required to approve token spending by pools via approveSpendingByPool function
 */
contract WombatRouter is Ownable, IWombatRouter {
    using SafeERC20 for IERC20;

    /// @notice approve spending of router tokens by pool
    /// @param tokens array of tokens to be approved
    /// @param pool to be approved to spend
    /// @dev needs to be done after asset deployment for router to be able to support the tokens
    function approveSpendingByPool(address[] calldata tokens, address pool) external onlyOwner {
        for (uint256 i; i < tokens.length; ++i) {
            IERC20(tokens[i]).approve(pool, type(uint256).max);
        }
    }

    /// @notice Swaps an exact amount of input tokens for as many output tokens as possible, along the route determined by the path
    /// @param tokenPath An array of token addresses. path.length must be >= 2.
    /// @param tokenPath The first element of the path is the input token, the last element is the output token.
    /// @param poolPath An array of pool addresses. The pools where the pathTokens are contained in order.
    /// @param amountIn the amount in
    /// @param minimumamountOut the minimum amount to get for user
    /// @param to the user to send the tokens to
    /// @param deadline the deadline to respect
    /// @return amountOut received by user
    /// @return haircut total fee charged by pool
    function swapExactTokensForTokens(
        address[] calldata tokenPath,
        address[] calldata poolPath,
        uint256 amountIn,
        uint256 minimumamountOut,
        address to,
        uint256 deadline
    ) external override returns (uint256 amountOut, uint256 haircut) {
        require(deadline >= block.timestamp, 'expired');
        require(tokenPath.length >= 2, 'invalid token path');
        require(poolPath.length == tokenPath.length - 1, 'invalid pool path');

        // get from token from users
        IERC20(tokenPath[0]).safeTransferFrom(address(msg.sender), address(this), amountIn);

        (amountOut, haircut) = _swap(tokenPath, poolPath, amountIn, to);
        require(amountOut >= minimumamountOut, 'amountOut too low');
    }

    /// @notice Private function to swap alone the token path
    /// @dev Assumes router has initial amountIn in balance.
    /// Assumes tokens being swapped have been approve via the approveSpendingByPool function
    /// @param tokenPath An array of token addresses. path.length must be >= 2.
    /// @param tokenPath The first element of the path is the input token, the last element is the output token.
    /// @param poolPath An array of pool addresses. The pools where the pathTokens are contained in order.
    /// @param amountIn the amount in
    /// @param to the user to send the tokens to
    /// @return amountOut received by user
    /// @return haircut total fee charged by pool
    function _swap(
        address[] calldata tokenPath,
        address[] calldata poolPath,
        uint256 amountIn,
        address to
    ) internal returns (uint256 amountOut, uint256 haircut) {
        // haircut of current call
        uint256 localHaircut;
        // next from amount, starts with amountIn in arg
        uint256 nextamountIn = amountIn;

        // first n - 1 swaps
        for (uint256 i; i < poolPath.length - 1; ++i) {
            // make the swap with the correct arguments
            (amountOut, localHaircut) = IPool(poolPath[i]).swap(
                tokenPath[i],
                tokenPath[i + 1],
                nextamountIn,
                0, // minimum amount received is ensured on calling function
                address(this),
                type(uint256).max // deadline is ensured on calling function
            );
            nextamountIn = amountOut;
            haircut += localHaircut;
        }

        // last swap
        uint256 i = poolPath.length - 1;
        (amountOut, localHaircut) = IPool(poolPath[i]).swap(
            tokenPath[i],
            tokenPath[i + 1],
            nextamountIn,
            0, // minimum amount received is ensured on calling function
            to,
            type(uint256).max // deadline is ensured on calling function
        );
        haircut += localHaircut;
    }

    /**
     * @notice Given an input asset amount and an array of token addresses, calculates the
     * maximum output token amount (accounting for fees and slippage).
     * @param tokenPath The token swap path
     * @param poolPath The token pool path
     * @param amountIn The from amount
     * @return amountOut The potential final amount user would receive
     * @return haircut The total haircut that would be applied
     */
    function getAmountOut(
        address[] calldata tokenPath,
        address[] calldata poolPath,
        int256 amountIn
    ) external view override returns (uint256 amountOut, uint256 haircut) {
        require(tokenPath.length >= 2, 'invalid token path');
        require(poolPath.length == tokenPath.length - 1, 'invalid pool path');

        // haircut of current call
        uint256 localHaircut;
        // next from amount, starts with amountIn in arg
        int256 nextamountIn = amountIn;
        // where to send tokens on next step

        for (uint256 i; i < poolPath.length; ++i) {
            // make the swap with the correct arguments
            (amountOut, localHaircut) = IPool(poolPath[i]).quotePotentialSwap(
                tokenPath[i],
                tokenPath[i + 1],
                nextamountIn
            );
            haircut += localHaircut;
            nextamountIn = int256(amountOut);
        }
    }

    /**
     * @notice Returns the minimum input asset amount required to buy the given output asset amount
     * (accounting for fees and slippage)
     * @param tokenPath The token swap path
     * @param poolPath The token pool path
     * @param amountOut The to amount
     * @return amountIn The potential final amount user would receive
     * @return haircut The total haircut that would be applied
     */
    function getAmountIn(
        address[] calldata tokenPath,
        address[] calldata poolPath,
        uint256 amountOut
    ) external view override returns (uint256 amountIn, uint256 haircut) {
        require(tokenPath.length >= 2, 'invalid token path');
        require(poolPath.length == tokenPath.length - 1, 'invalid pool path');

        // haircut of current call
        uint256 localHaircut;
        // next from amount, starts with amountIn in arg
        int256 nextAmountOut = int256(amountOut);
        // where to send tokens on next step

        for (uint256 i = poolPath.length; i > 0; --i) {
            (amountIn, localHaircut) = IPool(poolPath[i - 1]).quoteAmountIn(
                tokenPath[i - 1],
                tokenPath[i],
                nextAmountOut
            );
            haircut += localHaircut;
            nextAmountOut = int256(amountIn);
        }
    }
}
