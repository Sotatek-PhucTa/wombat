// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.5;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import '../interfaces/IAsset.sol';

interface IPoolV4 {
    function getTokens() external view returns (IERC20[] memory);

    function addressOfAsset(IERC20 token) external view returns (IAsset);

    function deposit(
        IERC20 token,
        uint256 amount,
        uint256 minimumLiquidity,
        address to,
        uint256 deadline,
        bool shouldStake
    ) external returns (uint256 liquidity);

    function withdraw(
        IERC20 token,
        uint256 liquidity,
        uint256 minimumAmount,
        address to,
        uint256 deadline
    ) external returns (uint256 amount);

    function withdrawFromOtherAsset(
        IERC20 fromToken,
        IERC20 toToken,
        uint256 liquidity,
        uint256 minimumAmount,
        address to,
        uint256 deadline
    ) external returns (uint256 amount);

    function swap(
        IERC20 fromToken,
        IERC20 toToken,
        uint256 fromAmount,
        uint256 minimumToAmount,
        address to,
        uint256 deadline
    ) external returns (uint256 actualToAmount, uint256 haircut);

    function quotePotentialDeposit(IERC20 token, uint256 amount) external view returns (uint256 liquidity);

    function quotePotentialSwap(
        IERC20 fromToken,
        IERC20 toToken,
        int256 fromAmount
    ) external view returns (uint256 potentialOutcome, uint256 haircut);

    function quotePotentialWithdraw(IERC20 token, uint256 liquidity) external view returns (uint256 amount);

    function quotePotentialWithdrawFromOtherAsset(
        IERC20 fromToken,
        IERC20 toToken,
        uint256 liquidity
    ) external view returns (uint256 finalAmount, uint256 withdrewAmount);

    function quoteAmountIn(
        IERC20 fromToken,
        IERC20 toToken,
        int256 toAmount
    ) external view returns (uint256 amountIn, uint256 haircut);
}
