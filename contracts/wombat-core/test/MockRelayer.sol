// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.5;

import '../libraries/Adaptor.sol';
import '../interfaces/IWormholeRelayer.sol';

interface IWormholeReceiver {
    function receiveWormholeMessages(bytes[] memory vaas, bytes[] memory additionalData) external payable;
}

/// @notice A mock Wormhole Relayer that implements the `IWormholeRelayer` interface
/// @dev This is a fake WormholeRelayer that delivers messages to the CrossChainPool. It receives messages from the fake Wormhole.
/// The main usage is the `deliver` method.
contract MockRelayer is IWormholeRelayer {
    uint256 constant gasMultiplier = 1e10;
    uint256 constant sendGasOverhead = 0.01 ether;

    function send(
        uint16 targetChain,
        bytes32 targetAddress,
        bytes32 refundAddress,
        uint256 maxTransactionFee,
        uint256 receiverValue,
        uint32 nonce
    ) external payable returns (uint64 sequence) {}

    function send(Send memory request, uint32 nonce, address relayProvider) external payable returns (uint64 sequence) {
        require(msg.value == 0.001 ether + request.maxTransactionFee + request.receiverValue, 'Invalid funds');
    }

    function deliver(IWormholeReceiver target, bytes[] calldata vaas) external {
        target.receiveWormholeMessages(vaas, new bytes[](vaas.length));
    }

    function forward(
        uint16 targetChain,
        bytes32 targetAddress,
        bytes32 refundAddress,
        uint256 maxTransactionFee,
        uint256 receiverValue,
        uint32 nonce
    ) external payable {}

    function forward(Send memory request, uint32 nonce, address relayProvider) external payable {}

    function multichainSend(
        MultichainSend memory sendContainer,
        uint32 nonce
    ) external payable returns (uint64 sequence) {}

    function multichainForward(MultichainSend memory requests, uint32 nonce) external payable {}

    function resend(ResendByTx memory request, address relayProvider) external payable returns (uint64 sequence) {}

    function quoteGas(
        uint16 targetChain,
        uint32 gasLimit,
        address relayProvider
    ) external pure returns (uint256 maxTransactionFee) {
        return gasLimit * gasMultiplier + sendGasOverhead;
    }

    function quoteGasResend(
        uint16 targetChain,
        uint32 gasLimit,
        address relayProvider
    ) external pure returns (uint256 maxTransactionFee) {
        return gasLimit * gasMultiplier;
    }

    function quoteReceiverValue(
        uint16 targetChain,
        uint256 targetAmount,
        address relayProvider
    ) external pure returns (uint256 receiverValue) {
        return targetAmount * gasMultiplier;
    }

    function toWormholeFormat(address addr) external pure returns (bytes32 whFormat) {}

    function fromWormholeFormat(bytes32 whFormatAddress) external pure returns (address addr) {}

    function getDefaultRelayProvider() external view returns (address relayProvider) {}

    function getDefaultRelayParams() external pure returns (bytes memory relayParams) {}
}
