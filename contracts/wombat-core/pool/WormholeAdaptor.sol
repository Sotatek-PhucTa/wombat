// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import '../libraries/Adaptor.sol';
import '../interfaces/ICoreRelayer.sol';
import '../interfaces/IWormhole.sol';

// Relayer testnet deployments: https://book.wormhole.com/reference/contracts.html#relayer-contracts

contract WormholeAdaptor is Adaptor {
    struct MegaPoolData {
        uint256 creditAmount;
        address toToken;
        uint256 minimumToAmount;
        address receiver;
    }

    ICoreRelayer public relayer;
    IWormhole public wormhole;

    /// @dev wormhole chainId => adaptor address
    mapping(uint16 => address) public adaptorAddress;

    /// @dev hash => is message delivered
    mapping(bytes32 => bool) public deliveredMessage;

    error ADAPTOR__MESSAGE_ALREADY_DELIVERED(bytes32 _hash);

    function initialize(ICoreRelayer _relayer, IWormhole _wormhole, IMegaPool _megaPool) public virtual initializer {
        relayer = _relayer;
        wormhole = _wormhole;

        __Adaptor_init(_megaPool);
    }

    /**
     * External/public functions
     */

    /**
     * @notice A convinience function for redeliver
     * @dev Redeliver could actually be invoked permisionless on any of the chain that wormhole supports
     */
    function requestRedeliver(
        uint16 sourceChain,
        bytes32 sourceTxHash,
        uint32 sourceNonce,
        uint16 targetChain
    ) external payable {
        // const redeliveryBudget = relayer.quoteGasReeliveryFee(
        //     TARGET_CHAIN,
        //     gasLimit,
        //     relayer.getDefaultRelayProvider()
        // );

        // const applicationBudget = relayer.quoteApplicationBudgetFee(targetChain, 0, relayer.getDefaultRelayProvider());

        ICoreRelayer.RedeliveryByTxHashRequest memory redeliveryRequest = ICoreRelayer.RedeliveryByTxHashRequest(
            sourceChain,
            sourceTxHash,
            sourceNonce,
            targetChain,
            msg.value - wormhole.messageFee(),
            0,
            relayer.getDefaultRelayParams()
        );

        // computeBudget + applicationBudget + wormholeFee should equal the msg.value
        relayer.requestRedelivery{value: msg.value}(redeliveryRequest, sourceNonce, relayer.getDefaultRelayProvider());
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
        uint256 toChain,
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
            200 // consistencyLevel. TODO: confirm the value
        );

        // calculate cost to deliver this message
        // uint256 computeBudget = relayer.quoteGasDeliveryFee(toChain, gasLimit, relayer.getDefaultRelayProvider());

        // calculate cost to cover application budget of 100 wei on the targetChain.
        // if you don't need an application budget, feel free to skip this and just pass 0 to the request
        // uint256 applicationBudget = relayer.quoteApplicationBudgetFee(
        //     targetChain,
        //     100,
        //     relayer.getDefaultRelayProvider()
        // );

        // require(msg.value > deliveryFeeBuffer + core_bridge.messageFee());

        require(toChain <= type(uint16).max);
        ICoreRelayer.DeliveryRequest memory request = ICoreRelayer.DeliveryRequest(
            uint16(toChain), // targetChain
            _ethAddrToWormholeAddr(adaptorAddress[uint16(toChain)]), // targetAddress
            _ethAddrToWormholeAddr(receiver), // refundAddress
            msg.value - 2 * wormhole.messageFee(), // computeBudget - should be calculate from `quoteEvmDeliveryPrice`
            0, // applicationBudget - convert to native currency at the target chain
            relayer.getDefaultRelayParams() // relayParameters
        );

        // computeBudget + applicationBudget + wormholeFee should equal the msg.value
        relayer.requestDelivery{value: msg.value - wormhole.messageFee()}(
            request,
            nonce,
            relayer.getDefaultRelayProvider()
        );
    }

    /**
     * Read-only functions
     */

    function estimateGasDeliveryFee(
        uint16 toChain,
        uint32 gasLimit,
        uint256 targetGasRefund
    ) external view returns (uint256 deliveryFee) {
        IRelayProvider provider = relayer.getDefaultRelayProvider();

        // One `wormhole.messageFee()` is included in `quoteGasDeliveryFee`
        // TODO: include the `targetGasRefund` in the delivery fee as well
        return relayer.quoteGasDeliveryFee(toChain, gasLimit, provider) + wormhole.messageFee();
    }

    function _wormholeAddrToEthAddr(bytes32 addr) internal pure returns (address) {
        return address(uint160(uint256(addr)));
    }

    function _ethAddrToWormholeAddr(address addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(addr)));
    }
}
