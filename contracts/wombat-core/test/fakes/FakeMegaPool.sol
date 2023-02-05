// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import '../../pool/MegaPool.sol';
import '../../pool/HighCovRatioFeePoolV3.sol';
import '../../interfaces/IAdaptor.sol';
import '../../interfaces/IMegaPool.sol';

/**
 * This is a fake Pool that implements swap with swapTokensForCredit and swapCreditForTokens.
 * This lets us verify the behaviour of quoteSwap and swap has not changed in our cross-chain implementation.
 */
contract FakeMegaPool is MegaPool {
    using DSMath for uint256;
    using SafeERC20 for IERC20;
    using SignedSafeMath for int256;

    function swap(
        address fromToken,
        address toToken,
        uint256 fromAmount,
        uint256 minimumToAmount,
        address to,
        uint256 /*deadline*/
    ) external override nonReentrant whenNotPaused returns (uint256 actualToAmount, uint256 haircut) {
        IAsset fromAsset = _assetOf(fromToken);
        IAsset toAsset = _assetOf(toToken);

        (uint256 creditAmount, uint256 haircut1) = _swapTokensForCredit(
            fromAsset,
            fromAmount.toWad(fromAsset.underlyingTokenDecimals()),
            0
        );

        uint8 toDecimal = toAsset.underlyingTokenDecimals();
        (uint256 toAmount, uint256 haircut2) = _swapCreditForTokens(
            toAsset,
            creditAmount,
            minimumToAmount.toWad(toDecimal)
        );
        require(toAmount >= minimumToAmount, 'toAmount >= minimumToAmount');

        haircut = haircut1 + haircut2;
        actualToAmount = toAmount;
        IERC20(fromToken).safeTransferFrom(msg.sender, address(fromAsset), fromAmount);
        toAsset.transferUnderlyingToken(to, actualToAmount);
    }
}