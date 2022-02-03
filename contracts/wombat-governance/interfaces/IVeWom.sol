// SPDX-License-Identifier: MIT
pragma solidity 0.8.5;

import '@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol';

/**
 * @dev Interface of the VeWom
 */
interface IVeWom is IERC721Receiver {
    function totalSupply() external view returns (uint256);

    function balanceOf(address _addr) external view returns (uint256);

    function isUser(address _addr) external view returns (bool);

    function deposit(uint256 _amount) external;

    function claim() external;

    function pending(address _addr) external view returns (uint256);

    function withdraw(uint256 _amount) external;

    function getStakedAmount(address _addr) external view returns (uint256);

    function getVotes(address _account) external view returns (uint256);
}
