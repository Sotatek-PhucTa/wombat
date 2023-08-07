// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.5;

import '../interfaces/IWormhole.sol';

contract MockWormhole {
    struct EncodedVM {
        uint16 emitterChainId;
        bytes32 emitterAddress;
        bytes payload;
    }

    /// @notice mapping from index to message
    bytes[] messages;

    function generatePayload(
        address toToken,
        uint256 creditAmount,
        uint256 minimumToAmount,
        address receiver
    ) external pure returns (bytes memory) {
        return _encode(toToken, creditAmount, minimumToAmount, receiver);
    }

    // copy from Adaptor
    function _encode(
        address toToken,
        uint256 creditAmount,
        uint256 minimumToAmount,
        address receiver
    ) internal pure returns (bytes memory) {
        require(toToken != address(0), 'toToken cannot be zero');
        require(receiver != address(0), 'receiver cannot be zero');
        require(creditAmount != uint256(0), 'creditAmount cannot be zero');
        require(toToken != receiver, 'toToken cannot be receiver');

        return abi.encode(toToken, creditAmount, minimumToAmount, receiver);
    }

    // note that `sequence` doesn't advance with this function
    function generateVM(
        address emitterAddress,
        uint16 emitterChainId,
        bytes memory payload
    ) public pure returns (bytes memory vm) {
        EncodedVM memory encodedVM;

        encodedVM.emitterChainId = emitterChainId;
        encodedVM.emitterAddress = bytes32(uint256(uint160(emitterAddress)));
        encodedVM.payload = payload;

        vm = abi.encode(encodedVM.emitterChainId, encodedVM.emitterAddress, encodedVM.payload);
    }

    function publishMessage(bytes memory payload) external payable returns (uint64 sequence) {
        sequence = uint64(messages.length);
        uint16 chainId;
        assembly {
            chainId := chainid()
        }
        bytes memory vm = generateVM(msg.sender, 2, payload);
        messages.push(vm);
    }

    function parseAndVerifyVM(bytes calldata encodedVM_) external pure returns (IWormhole.VM memory vm) {
        uint64 sequence;
        (vm.emitterChainId, vm.emitterAddress, vm.payload) = abi.decode(encodedVM_, (uint16, bytes32, bytes));

        vm.hash = keccak256(abi.encode(vm.emitterChainId, sequence));
    }

    function messageFee() external view returns (uint256) {
        return 0.001 ether;
    }
}
