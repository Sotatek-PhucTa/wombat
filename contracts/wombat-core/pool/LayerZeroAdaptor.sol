// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import '../libraries/Adaptor.sol';
import '../libraries/BytesLib.sol';
import '../libraries/ExcessivelySafeCall.sol';
import '../interfaces/ILayerZeroEndpoint.sol';
import '../interfaces/ILayerZeroReceiver.sol';

contract LayerZeroAdaptor is Adaptor, ILayerZeroUserApplicationConfig, ILayerZeroReceiver {
    using BytesLib for bytes;
    using ExcessivelySafeCall for address;

    ILayerZeroEndpoint public endpoint;

    /// @dev LayerZero chainId => adaptor address
    mapping(uint16 => bytes) public trustedRemoteLookup;

    /// @dev chainId => adaptor address => nonce => keccak(payload)
    mapping(uint16 => mapping(bytes => mapping(uint256 => bytes32))) public failedMessages;

    event MessageFailed(
        uint16 srcChainId,
        bytes srcAddress,
        uint256 inboundNonce,
        uint256 outboundNonce,
        bytes payload,
        bytes reason
    );
    event RetryMessageSuccess(uint16 srcChainId, bytes srcAddress, uint256 inboundNonce, bytes32 _payloadHash);
    event SetTrustedRemoteAddress(uint16 remoteChainId, bytes remoteAddress);

    function initialize(ILayerZeroEndpoint _endpoint, ICrossChainPool _crossChainPool) public virtual initializer {
        endpoint = _endpoint;

        __Adaptor_init(_crossChainPool);
    }

    /*
     * the default LayerZero messaging behaviour is blocking, i.e. any failed message will block the channel
     * try-catch all fail messages and store locally for future retry. hence, non-blocking
     * NOTE: if the srcAddress is not configured properly, it will still block the message pathway from (srcChainId, srcAddress)
     */
    function lzReceive(
        uint16 srcChainId,
        bytes calldata srcAddress,
        uint64 inboundNonce,
        bytes calldata payload
    ) external override {
        // lzReceive must be called by the endpoint for security
        require(_msgSender() == address(endpoint), 'invalid endpoint caller');

        bytes memory trustedRemote = trustedRemoteLookup[srcChainId];
        // if will still block the message pathway from (srcChainId, srcAddress). should not receive message from untrusted remote.
        require(
            srcAddress.length == trustedRemote.length &&
                trustedRemote.length > 0 &&
                keccak256(srcAddress) == keccak256(trustedRemote),
            'invalid source sending contract'
        );
        (uint256 outboundNonce, bytes memory realPayload) = abi.decode(payload, (uint256, bytes));

        (bool success, bytes memory reason) = address(this).excessivelySafeCall(
            gasleft(),
            150,
            abi.encodeWithSelector(
                this.nonblockingLzReceive.selector,
                srcChainId,
                srcAddress,
                outboundNonce,
                realPayload
            )
        );
        // try-catch all errors/exceptions
        if (!success) {
            _storeFailedMessage(srcChainId, srcAddress, inboundNonce, outboundNonce, realPayload, reason);
        }
    }

    function nonblockingLzReceive(uint16 srcChainId, bytes calldata srcAddress, bytes calldata payload) public {
        // only internal transaction
        require(_msgSender() == address(this), 'NonblockingLzApp: caller must be LzApp');
        _nonblockingLzReceive(srcChainId, srcAddress, payload);
    }

    function retryMessage(
        uint16 srcChainId,
        bytes calldata srcAddress,
        uint64 inboundNonce,
        bytes calldata payload
    ) public payable virtual {
        // assert there is message to retry
        bytes32 payloadHash = failedMessages[srcChainId][srcAddress][inboundNonce];
        require(payloadHash != bytes32(0), 'NonblockingLzApp: no stored message');
        require(keccak256(payload) == payloadHash, 'NonblockingLzApp: invalid payload');
        // clear the stored message
        failedMessages[srcChainId][srcAddress][inboundNonce] = bytes32(0);
        // execute the message. revert if it fails again
        _nonblockingLzReceive(srcChainId, srcAddress, payload);
        emit RetryMessageSuccess(srcChainId, srcAddress, inboundNonce, payloadHash);
    }

    function setConfig(
        uint16 _version,
        uint16 _chainId,
        uint _configType,
        bytes calldata _config
    ) external override onlyOwner {
        endpoint.setConfig(_version, _chainId, _configType, _config);
    }

    function setSendVersion(uint16 _version) external override onlyOwner {
        endpoint.setSendVersion(_version);
    }

    function setReceiveVersion(uint16 _version) external override onlyOwner {
        endpoint.setReceiveVersion(_version);
    }

    function forceResumeReceive(uint16 _srcChainId, bytes calldata _srcAddress) external override onlyOwner {
        endpoint.forceResumeReceive(_srcChainId, _srcAddress);
    }

    function setTrustedRemoteAddress(uint16 _remoteChainId, bytes calldata _remoteAddress) external onlyOwner {
        trustedRemoteLookup[_remoteChainId] = abi.encodePacked(_remoteAddress, address(this));
        emit SetTrustedRemoteAddress(_remoteChainId, _remoteAddress);
    }

    function getTrustedRemoteAddress(uint16 _remoteChainId) external view returns (bytes memory) {
        bytes memory path = trustedRemoteLookup[_remoteChainId];
        require(path.length != 0, 'no trusted path record');
        return path.slice(0, path.length - 20); // the last 20 bytes should be address(this)
    }

    function estimateDeliveryFee(
        address toToken,
        uint16 toChain, // LayerZero chain ID
        uint256 fromAmount,
        uint256 minimumToAmount,
        address receiver,
        uint256 receiverValue,
        uint256 deliveryGasLimit
    ) public view returns (uint nativeFee, uint zroFee) {
        return
            endpoint.estimateFees(
                toChain,
                address(this),
                _encode(toToken, fromAmount, minimumToAmount, receiver),
                false,
                _getAdapterParams(receiver, receiverValue, deliveryGasLimit)
            );
    }

    function _nonblockingLzReceive(uint16 srcChainId, bytes memory srcAddress, bytes memory payload) internal {
        (address toToken, uint256 creditAmount, uint256 minimumToAmount, address receiver) = _decode(payload);
        _swapCreditForTokens(
            srcChainId,
            _lzAddrToEthSrcAddr(srcAddress),
            toToken,
            creditAmount,
            minimumToAmount,
            receiver
        );
    }

    function _bridgeCreditAndSwapForTokens(
        address toToken,
        uint256 toChain, // LayerZero chain ID
        uint256 fromAmount,
        uint256 minimumToAmount,
        address receiver,
        uint256 receiverValue,
        uint256 deliveryGasLimit
    ) internal override returns (uint256 sequence) {
        // Delivery fee attached to the txn is done off-chain via `estimateDeliveryFee` to reduce gas cost
        // Unused `deliveryGasLimit` is sent to the `refundAddress` (`receiver`).

        require(toChain <= type(uint16).max, 'invalid chain ID');

        // destChain(16bit) | nonce(64bit)
        sequence = uint256(endpoint.getOutboundNonce(uint16(toChain), address(this)));
        endpoint.send{value: msg.value}(
            uint16(toChain),
            trustedRemoteLookup[uint16(toChain)],
            abi.encode(sequence, _encode(toToken, fromAmount, minimumToAmount, receiver)),
            payable(receiver),
            address(0),
            _getAdapterParams(receiver, receiverValue, deliveryGasLimit)
        );
    }

    function _getAdapterParams(
        address receiver,
        uint256 receiverValue,
        uint256 deliveryGasLimit
    ) internal pure returns (bytes memory adapterParams) {
        adapterParams = receiverValue > 0
            ? abi.encodePacked(uint16(2), deliveryGasLimit, receiverValue, receiver)
            : abi.encodePacked(uint16(1), deliveryGasLimit);
    }

    function _storeFailedMessage(
        uint16 srcChainId,
        bytes memory srcAddress,
        uint256 outboundNonce,
        uint256 inboundNonce,
        bytes memory payload,
        bytes memory reason
    ) internal {
        failedMessages[srcChainId][srcAddress][inboundNonce] = keccak256(payload);
        emit MessageFailed(srcChainId, srcAddress, inboundNonce, outboundNonce, payload, reason);
    }

    function _lzAddrToEthSrcAddr(bytes memory addr) internal pure returns (address) {
        bytes20 srcAddr = bytes20(addr.slice(0, addr.length - 20));
        require(address(srcAddr) != address(0), 'addr bytes cannot be zero');
        return address(srcAddr);
    }
}
