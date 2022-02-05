// DO NOT DEPLOY TO MAINNET
// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.5;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../interfaces/IVeWom.sol';
import '../interfaces/IWom.sol';
import '../VeWom.sol';

contract MockAttacker {
    IVeWom public veWom;
    IWom public wom;

    constructor(IWom _wom, IVeWom _veWom) {
        wom = _wom;
        veWom = _veWom;
    }

    function deposit(uint256 _amount) public {
        veWom.deposit(_amount);
    }

    function approve(uint256 _amount) public {
        wom.approve(address(veWom), _amount);
    }
}
