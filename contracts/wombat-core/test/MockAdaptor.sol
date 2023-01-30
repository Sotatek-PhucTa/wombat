// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.5;

import '../libraries/Adaptor.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract MockAdaptor is Adaptor {
    struct MegaPoolData {
        uint256 creditAmount;
        address toToken;
        uint256 minimumToAmount;
        address receiver;
    }

    struct DeliverData {
        address deliverAddr;
        bytes data;
    }

    struct DeliveryRequest {
        uint256 id;
        uint16 sourceChain;
        address sourceAddress;
        uint16 targetChain;
        address targetAddress;
        DeliverData deliverData; //Has the gas limit to execute with
    }

    uint16 public chainId;
    uint256 public nonceCounter;

    // nonce => message
    mapping(uint256 => DeliveryRequest) public messages;

    // fromChain => nonce => processed
    mapping(uint256 => mapping(uint256 => bool)) public messageDelivered;

    function initialize(uint16 _mockChainId, IMegaPool _megaPool) external virtual initializer {
        __Adaptor_init(_megaPool);

        chainId = _mockChainId;
        nonceCounter = 1; // use non-zero value
    }

    function _bridgeCreditAndSwapForTokens(
        address toToken,
        uint256 toChain,
        uint256 fromAmount,
        uint256 minimumToAmount,
        address receiver,
        uint32 // nonce: not used
    ) internal override returns (uint256 trackingId) {
        MegaPoolData memory megaPoolData = MegaPoolData({
            creditAmount: fromAmount,
            toToken: toToken,
            minimumToAmount: minimumToAmount,
            receiver: receiver
        });

        bytes memory data = abi.encode(megaPoolData);
        DeliverData memory deliverData = DeliverData({deliverAddr: address(0), data: data});
        uint256 nonce = nonceCounter++;
        messages[nonce] = DeliveryRequest({
            id: nonce,
            sourceChain: chainId,
            sourceAddress: address(this),
            targetChain: uint16(toChain),
            targetAddress: address(0),
            deliverData: deliverData
        });
        return (trackingId << 16) + nonce;
    }

    /* Message receiver, should be invoked by the bridge */

    function deliver(
        uint256 id,
        uint16 fromChain,
        address fromAddr,
        uint16 targetChain,
        address targetAddress,
        DeliverData calldata deliverData
    ) external returns (bool success, uint256 amount) {
        require(targetChain == chainId, 'targetChain invalid');
        require(!messageDelivered[fromChain][id], 'message delivered');
        _isTrustedContract(fromChain, fromAddr);

        messageDelivered[fromChain][id] = true;

        MegaPoolData memory data = abi.decode(deliverData.data, (MegaPoolData));
        return
            _swapCreditForTokens(
                fromChain,
                fromAddr,
                data.toToken,
                data.creditAmount,
                data.minimumToAmount,
                data.receiver,
                id
            );
    }

    function faucetCredit(uint256 creditAmount) external {
        megaPool.mintCredit(creditAmount, msg.sender, 0);
    }
}
