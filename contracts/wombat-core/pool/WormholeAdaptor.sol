// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import '../libraries/Adaptor.sol';
import '../interfaces/IWormholeRelayer.sol';
import '../interfaces/IWormhole.sol';

// Relayer testnet deployments: https://book.wormhole.com/reference/contracts.html#relayer-contracts

/// @title WormholeAdaptor
/// @notice `WormholeAdaptor` uses the generic relayer of wormhole to send message across different networks
contract WormholeAdaptor is Adaptor {
    struct CrossChainPoolData {
        uint256 creditAmount;
        address toToken;
        uint256 minimumToAmount;
        address receiver;
    }

    IWormholeRelayer public relayer;
    IWormhole public wormhole;

    uint8 public consistencyLevel;

    /// @dev wormhole chainId => adaptor address
    mapping(uint16 => address) public adaptorAddress;

    /// @dev hash => is message delivered
    mapping(bytes32 => bool) public deliveredMessage;

    error ADAPTOR__MESSAGE_ALREADY_DELIVERED(bytes32 _hash);

    function initialize(
        IWormholeRelayer _relayer,
        IWormhole _wormhole,
        ICrossChainPool _crossChainPool,
        uint8 _consistencyLevel
    ) public virtual initializer {
        relayer = _relayer;
        wormhole = _wormhole;
        consistencyLevel = _consistencyLevel;

        __Adaptor_init(_crossChainPool);
    }

    /**
     * External/public functions
     */

    /**
     * @notice A convinience function to redeliver
     * @dev Redeliver could actually be invoked permisionless on any of the chain that wormhole supports
     * Delivery fee attached to the txn should be done off-chain via `WormholeAdaptor.estimateRedeliveryFee` to reduce gas cost
     */
    function requestResend(
        uint16 sourceChain,
        bytes32 sourceTxHash,
        uint32 sourceNonce,
        uint16 targetChain
    ) external payable {
        IWormholeRelayer.ResendByTx memory redeliveryRequest = IWormholeRelayer.ResendByTx({
            sourceChain: sourceChain,
            sourceTxHash: sourceTxHash,
            sourceNonce: sourceNonce,
            targetChain: targetChain,
            deliveryIndex: uint8(1), // TODO: what is this?
            multisendIndex: uint8(0),
            newMaxTransactionFee: msg.value,
            newReceiverValue: 0,
            newRelayParameters: relayer.getDefaultRelayParams()
        });

        // `maxTransactionFee` should equal to `value`
        relayer.resend{value: msg.value}(redeliveryRequest, relayer.getDefaultRelayProvider());
    }

    /**
     * Permisioneed functions
     */

    /**
     * @dev core relayer is assumed to be trusted so re-entrancy protection is not required
     * Note: This function should NOT throw; Otherwise it will be a delivery failure
     * (ref: https://book.wormhole.com/technical/evm/relayer.html#delivery-failures)
     */
    function receiveWormholeMessages(bytes[] memory vaas, bytes[] memory) external {
        // Cross-chain swap is experimental, only the core relayer can invoke this function
        // TODO: Assess if this line is required: is there trust assumption to the generic relayer?
        require(msg.sender == address(relayer), 'not authorized');

        uint256 numObservations = vaas.length;
        for (uint256 i = 0; i < numObservations - 1; ++i) {
            (IWormhole.VM memory vm, bool valid, string memory reason) = wormhole.parseAndVerifyVM(vaas[i]);
            // requre all messages to be valid, otherwise the whole transaction is reverted
            require(valid, reason);

            // only accept messages from a trusted chain & contract
            // Assumption: the core relayer must verify the target chain ID and target contract address
            if (adaptorAddress[vm.emitterChainId] != _wormholeAddrToEthAddr(vm.emitterAddress)) continue;

            (address toToken, uint256 creditAmount, uint256 minimumToAmount, address receiver) = _decode(vm.payload);

            // Important note: While Wormhole is in beta, the selected RelayProvider can potentially
            // reorder, omit, or mix-and-match VAAs if they were to behave maliciously
            _recordMessageHash(vm.hash);

            // `vm.sequence` is effectively the `trackingId`
            _swapCreditForTokens(
                vm.emitterChainId,
                _wormholeAddrToEthAddr(vm.emitterAddress),
                toToken,
                creditAmount,
                minimumToAmount,
                receiver,
                vm.sequence
            );
        }
    }

    function setAdaptorAddress(uint16 wormholeChainId, address addr) external onlyOwner {
        adaptorAddress[wormholeChainId] = addr;
    }

    /**
     * Internal functions
     */

    function _recordMessageHash(bytes32 _hash) internal {
        // revert if the message is already delivered
        // TODO: verify if the hash is collision resistant
        if (deliveredMessage[_hash]) revert ADAPTOR__MESSAGE_ALREADY_DELIVERED(_hash);
        deliveredMessage[_hash] = true;
    }

    function _bridgeCreditAndSwapForTokens(
        address toToken,
        uint256 toChain, // wormhole chain ID
        uint256 fromAmount,
        uint256 minimumToAmount,
        address receiver,
        uint32 nonce
    ) internal override returns (uint256 trackingId) {
        // publish the message to wormhole
        // (emitterChainID, emitterAddress, sequence aka trackingId) is used to retrive the generated VAA from the Guardian Network and for tracking
        trackingId = wormhole.publishMessage{value: wormhole.messageFee()}(
            nonce, // nonce
            _encode(toToken, fromAmount, minimumToAmount, receiver), // payload
            consistencyLevel // Consistency level. Use 1 for finalized, and use 15 blocks for BNB chain; Ref: https://book.wormhole.com/wormhole/3_coreLayerContracts.html#consistency-levels
        );

        // Delivery fee attached to the txn is done off-chain via `estimateDeliveryFee` to reduce gas cost
        // Unused `computeBudget` is sent to the `refundAddress` (`receiver`).
        // Ref: https://book.wormhole.com/technical/evm/relayer.html#compute-budget-and-refunds

        // calculate cost to deliver this message
        // uint256 computeBudget = relayer.quoteGasDeliveryFee(toChain, gasLimit, relayer.getDefaultRelayProvider());

        // calculate cost to cover application budget of 100 wei on the targetChain.
        // if you don't need an application budget, feel free to skip this and just pass 0 to the request
        // uint256 applicationBudget = relayer.quoteApplicationBudgetFee(
        //     targetChain,
        //     100,
        //     relayer.getDefaultRelayProvider()
        // );

        require(toChain <= type(uint16).max);

        IWormholeRelayer.Send memory request = IWormholeRelayer.Send({
            targetChain: uint16(toChain),
            targetAddress: relayer.toWormholeFormat(adaptorAddress[uint16(toChain)]),
            refundAddress: relayer.toWormholeFormat(receiver), // This will be ignored on the target chain if the intent is to perform a forward
            maxTransactionFee: msg.value - 2 * wormhole.messageFee(),
            receiverValue: 0,
            relayParameters: relayer.getDefaultRelayParams()
        });
        // `maxTransactionFee + receiverValue + wormholeFee` should equal to `value`
        relayer.send{value: msg.value - wormhole.messageFee()}(request, nonce, relayer.getDefaultRelayProvider());
    }

    /**
     * Read-only functions
     */

    /**
     * @notice Estimate the amount of message value required to deliver a message with given `gasLimit` and `receiveValue`
     * A buffer should be added to `gasLimit` in case the amount of gas required is higher than the expectation
     * @param toChain wormhole chain ID
     * @param gasLimit gas limit of the callback function on the designated network
     * @param receiveValue target amount of gas token to receive
     * @dev TODO: Add a mock relayer to test this function
     */
    function estimateDeliveryFee(
        uint16 toChain,
        uint32 gasLimit,
        uint256 receiveValue
    ) external view returns (uint256 deliveryFee) {
        address provider = relayer.getDefaultRelayProvider();

        // One `wormhole.messageFee()` is included in `quoteGas`
        return
            (relayer.quoteGas(toChain, gasLimit, provider) + wormhole.messageFee()) +
            relayer.quoteReceiverValue(toChain, receiveValue, provider);
    }

    function estimateRedeliveryFee(uint16 toChain, uint32 gasLimit) external view returns (uint256 redeliveryFee) {
        address provider = relayer.getDefaultRelayProvider();

        return relayer.quoteGasResend(toChain, gasLimit, provider);
    }

    function _wormholeAddrToEthAddr(bytes32 addr) internal pure returns (address) {
        return address(uint160(uint256(addr)));
    }

    function _ethAddrToWormholeAddr(address addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(addr)));
    }
}
