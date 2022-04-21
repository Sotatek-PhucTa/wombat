import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

/*
 * Instructions
 * 1. hh node --no-deploy
 * 2. hh run scripts/repro.ts --network localhost
 */

run()

async function run() {
  const [owner, user1, user2] = await ethers.getSigners()

  const pool = await ethers.getContractAt('Pool', '0x76F3378F13c6e9c5F477d1D9dE2A21151E883D71')
  console.log('Pool', 'A:', prettyPrint(await pool.ampFactor()))

  const merc20 = await ethers.getContractAt('MockERC20', '0x326335BA4e70cb838Ee55dEB18027A6570E5144d')
  await merc20.connect(user1).faucet(ethers.utils.parseEther('1234'))
  await merc20.connect(user1).approve(pool.address, ethers.constants.MaxUint256)

  const asset = await ethers.getContractAt('Asset', await pool.addressOfAsset(merc20.address))
  console.log('Asset', 'cash:', prettyPrint(await asset.cash()), 'liability:', prettyPrint(await asset.liability()))

  const amount = ethers.utils.parseEther('0.01')
  console.log('Deposit amount', prettyPrint(amount))
  await pool
    .connect(user1)
    .deposit(
      '0x326335BA4e70cb838Ee55dEB18027A6570E5144d',
      amount,
      '0x67F6e6EEB3e61e23Ee765905F5a04a2Bbd0E3a73',
      ethers.constants.MaxUint256,
      false
    )
}

function prettyPrint(bn: BigNumber) {
  return bn.div(1e12).toNumber() / 1e6
}
