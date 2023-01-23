// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import '../libraries/Adaptor.sol';
import '../interfaces/ICoreRelayer.sol';
import '../interfaces/IWormhole.sol';

contract WomholeAdaptor is Adaptor {
    struct MegaPoolData {
        uint256 creditAmount;
        address toToken;
        uint256 minimumToAmount;
        address receiver;
    }

    ICoreRelayer public relayer;
    IWormhole public wormhole;

    function initialize(
        ICoreRelayer _relayer,
        IWormhole _wormhole,
        IMegaPool _megaPool
    ) public virtual initializer {
        relayer = _relayer;
        wormhole = _wormhole;

        __Adaptor_init(_megaPool);
    }

    /**
     * External/public functions
     */

    function receiveWormholeMessages(bytes[] memory vaas, bytes[] memory) external {
        require(msg.sender == address(relayer), 'not authorized');

        uint256 numObservations = vaas.length;
        for (uint256 i = 0; i < numObservations - 1; ) {
            (IWormhole.VM memory vm, bool valid, string memory reason) = wormhole.parseAndVerifyVM(vaas[i]);
            require(valid, reason);

            // only accept messages from a trusted chain & contract
            if (!trustedContract[vm.emitterChainId][_wormholeAddrToEthAddr(vm.emitterAddress)]) continue;

            (address toToken, uint256 creditAmount, uint256 minimumToAmount, address receiver) = _decode(vm.payload);

            // Important note: While Wormhole is in beta, the selected RelayProvider can potentially
            // reorder, omit, or mix-and-match VAAs if they were to behave maliciously

            // TODO: Replay protection

            // `vm.sequence` is effectively the `trackingId`
            _swapCreditForTokens(toToken, creditAmount, minimumToAmount, receiver, vm.sequence);
        }
    }

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
            msg.value, // TODO: confirm we don't need to pay wormhole message fee
            0,
            relayer.getDefaultRelayParams()
        );

        relayer.requestRedelivery{value: msg.value}(redeliveryRequest, sourceNonce, relayer.getDefaultRelayProvider());
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
            _ethAddrToWormholeAddr(receiver), // targetAddress
            _ethAddrToWormholeAddr(receiver), // refundAddress
            msg.value - 2 * wormhole.messageFee(), // computeBudget - should be calculate from `quoteEvmDeliveryPrice`
            0, // applicationBudget - convert to native currency at the target chain
            relayer.getDefaultRelayParams() // relayParameters
        );

        // TODO: confirm we don't need to pay wormhole message fee
        relayer.requestDelivery{value: msg.value - wormhole.messageFee()}(
            request,
            nonce,
            relayer.getDefaultRelayProvider()
        );
    }

    /**
     * Read-only functions
     */

    function estimateCost(uint16 toChain, uint32 gasLimit) external view returns (uint256 gasEstimate) {
        return relayer.quoteGasDeliveryFee(toChain, gasLimit, relayer.getDefaultRelayProvider());
    }

    function _wormholeAddrToEthAddr(bytes32 addr) internal pure returns (address) {
        return address(uint160(uint256(addr)));
    }

    function _ethAddrToWormholeAddr(address addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(addr)));
    }
}
