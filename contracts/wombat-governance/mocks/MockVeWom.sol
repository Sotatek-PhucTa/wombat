// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.5;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '../VeWom.sol';
import '../MasterWombat.sol';
import '../interfaces/IWombatNFT.sol';

contract MockVeWom is Initializable, VeWom {
    function init(
        IERC20 _wom,
        MasterWombat _wombatMaster,
        IWombatNFT _nft
    ) external initializer {
        initialize(_wom, _wombatMaster, _nft);
    }

    function faucet(uint256 _amount) public {
        _mint(msg.sender, _amount);
    }

    function transfer(address _beneficiary, uint256 _amount) public {
        _mint(_beneficiary, _amount);
    }

    function burn(address _account, uint256 _amount) public {
        _burn(_account, _amount);
    }
}
