// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import '../libraries/Adaptor.sol';
import '../libraries/BytesLib.sol';
import '../libraries/ExcessivelySafeCall.sol';
import '../interfaces/ILayerZeroEndpoint.sol';
import '../interfaces/ILayerZeroReceiver.sol';
import '../layerzero/NonblockingLzAppUpgradable.sol';

contract LayerZeroAdaptor is Adaptor, NonblockingLzAppUpgradable {
    using BytesLib for bytes;
    using ExcessivelySafeCall for address;

    function initialize(address _endpoint, ICrossChainPool _crossChainPool) public virtual initializer {
        __Adaptor_init(_crossChainPool);
        __LzApp_init(_endpoint);
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
            lzEndpoint.estimateFees(
                toChain,
                address(this),
                _encode(toToken, fromAmount, minimumToAmount, receiver),
                false,
                _getAdapterParams(receiver, receiverValue, deliveryGasLimit)
            );
    }

    function _nonblockingLzReceive(uint16 srcChainId, bytes memory srcAddress, uint64, bytes memory payload) internal override {
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
        sequence = uint256(lzEndpoint.getOutboundNonce(uint16(toChain), address(this))) + 1;
        lzEndpoint.send{value: msg.value}(
            uint16(toChain),
            trustedRemoteLookup[uint16(toChain)],
            _encode(toToken, fromAmount, minimumToAmount, receiver),
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

    function _lzAddrToEthSrcAddr(bytes memory addr) internal pure returns (address) {
        bytes20 srcAddr = bytes20(addr.slice(0, addr.length - 20));
        require(address(srcAddr) != address(0), 'addr bytes cannot be zero');
        return address(srcAddr);
    }
}
