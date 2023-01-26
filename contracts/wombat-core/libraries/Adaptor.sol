// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';

import '../libraries/BytesLib.sol';
import '../interfaces/IAdaptor.sol';
import '../interfaces/IMegaPool.sol';

abstract contract Adaptor is
    IAdaptor,
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    using BytesLib for bytes;

    IMegaPool public megaPool;

    /// @notice whether the contract is a trusted adaptor
    /// @dev wormhole chainId => contract address => bool
    mapping(uint256 => mapping(address => bool)) public trustedContract;

    /// @notice whether the token is valid
    /// @dev wormhole chainId => token address => bool
    /// Instead of a security feature, this is a sanity check in case user uses an invalid token address
    mapping(uint256 => mapping(address => bool)) public validToken;

    uint256[50] private _gap;

    event LogError(uint256 nonce, bytes data);

    error ADAPTOR__CONTRACT_NOT_TRUSTED();
    error ADAPTOR__INVALID_TOKEN();

    function __Adaptor_init(IMegaPool _megaPool) internal virtual onlyInitializing {
        __Ownable_init();
        __ReentrancyGuard_init_unchained();

        megaPool = _megaPool;
    }

    function bridgeCreditAndSwapForTokens(
        address toToken,
        uint256 toChain,
        uint256 fromAmount,
        uint256 minimumToAmount,
        address receiver,
        uint32 nonce
    ) external payable override returns (uint256 trackingId) {
        _isValidToken(toChain, toToken);
        return _bridgeCreditAndSwapForTokens(toToken, toChain, fromAmount, minimumToAmount, receiver, nonce);
    }

    /**
     * Internal functions
     */

    function _bridgeCreditAndSwapForTokens(
        address toToken,
        uint256 toChain,
        uint256 fromAmount,
        uint256 minimumToAmount,
        address receiver,
        uint32 nonce
    ) internal virtual returns (uint256 trackingId);

    function _isTrustedContract(uint256 chainId, address addr) internal view {
        if (!trustedContract[chainId][addr]) revert ADAPTOR__CONTRACT_NOT_TRUSTED();
    }

    function _isValidToken(uint256 chainId, address tokenAddr) internal view {
        if (!validToken[chainId][tokenAddr]) revert ADAPTOR__INVALID_TOKEN();
    }

    function _swapCreditForTokens(
        address toToken,
        uint256 creditAmount,
        uint256 minimumToAmount,
        address receiver,
        uint256 trackingId
    ) internal returns (bool success, uint256 amount) {
        try megaPool.completeSwapCreditForTokens(toToken, creditAmount, minimumToAmount, receiver, trackingId) returns (
            uint256 actualToAmount,
            uint256
        ) {
            return (true, actualToAmount);
        } catch (bytes memory reason) {
            // TODO: Investigate how can we decode error message from logs
            emit LogError(trackingId, reason);
            megaPool.mintCredit(creditAmount, receiver, trackingId);

            return (false, creditAmount);
        }
    }

    // TODO: test encode & decode
    function _encode(
        address toToken,
        uint256 creditAmount,
        uint256 minimumToAmount,
        address receiver
    ) internal pure returns (bytes memory) {
        return abi.encodePacked(toToken, creditAmount, minimumToAmount, receiver);
    }

    function _decode(bytes memory encoded)
        internal
        pure
        returns (
            address toToken,
            uint256 creditAmount,
            uint256 minimumToAmount,
            address receiver
        )
    {
        return (encoded.toAddress(0), encoded.toUint256(20), encoded.toUint256(52), encoded.toAddress(84));
    }

    /**
     * Permisioneed functions
     */

    function approveContract(uint256 wormholeChainId, address addr) external onlyOwner {
        require(!trustedContract[wormholeChainId][addr]);
        trustedContract[wormholeChainId][addr] = true;
    }

    function revokeTrustedContract(uint256 wormholeChainId, address addr) external onlyOwner {
        require(trustedContract[wormholeChainId][addr]);
        trustedContract[wormholeChainId][addr] = false;
    }

    function approveToken(uint256 wormholeChainId, address tokenAddr) external onlyOwner {
        require(!validToken[wormholeChainId][tokenAddr]);
        validToken[wormholeChainId][tokenAddr] = true;
    }

    function revokeToken(uint256 wormholeChainId, address tokenAddr) external onlyOwner {
        require(validToken[wormholeChainId][tokenAddr]);
        validToken[wormholeChainId][tokenAddr] = false;
    }
}
