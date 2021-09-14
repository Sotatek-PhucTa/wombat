// Demo for Wombat team
// Usage : npx hardhat run ./scripts/demo.ts --network "bsc"

import { deployments, ethers } from 'hardhat'
import { parseUnits } from '@ethersproject/units'
import readline = require('readline')
// import { usdc } from '../test/helpers/helper'

async function runDemo() {
  // Wait for all deployments to finish
  await deployments.all()

  // Setup deployed address constants
  const poolAddress = await (await deployments.get('Pool')).address
  const ETHTokenAddress = await (await deployments.get('AnyETH')).address
  const WETHeTokenAddress = await (await deployments.get('WETH.e')).address

  // Set deadline for calls
  const deadline = (await ethers.provider.getBlock('latest')).timestamp + 5000 // 5 secs after last block
  // const lastBlockTime = (await ethers.provider.getBlock('latest')).timestamp

  // Get Signers
  const [owner] = await ethers.getSigners()

  // Get DAI, USDC and USDT token deployed instances
  const ETHContract = await ethers.getContractAt('TestERC20', ETHTokenAddress, owner)
  const WETHeContract = await ethers.getContractAt('TestERC20', WETHeTokenAddress, owner)

  await waitUser('Demo initialized. Press any key to get 100 faucet ETH Tokens and approve spending by pool')

  // Get faucet USD
  await ETHContract.faucet(parseUnits('100', 18))
  await WETHeContract.faucet(parseUnits('100', 18))

  // Get Pool deployed instance
  const poolContract = await ethers.getContractAt('Pool', poolAddress, owner)

  // Approve tokens to be spent by pool before depositing (important)
  await ETHContract.connect(owner).approve(poolAddress, ethers.constants.MaxUint256)
  await WETHeContract.connect(owner).approve(poolAddress, ethers.constants.MaxUint256)

  console.log(`ETH Balance : ${ethers.utils.formatEther((await ETHContract.balanceOf(owner.address)).toString())}`)
  console.log(`WETH.e Balance : ${ethers.utils.formatEther((await WETHeContract.balanceOf(owner.address)).toString())}`)

  await waitUser('Got Faucet ETH and WETH.e. Press any key to deposit 50 of each to pool')

  // Deposit DAI, USDC and USDT
  await poolContract.connect(owner).deposit(ETHTokenAddress, parseUnits('50', 18), owner.address, deadline)
  await poolContract.connect(owner).deposit(WETHeTokenAddress, parseUnits('50', 18), owner.address, deadline)

  console.log(`ETH Balance : ${ethers.utils.formatEther((await ETHContract.balanceOf(owner.address)).toString())}`)
  console.log(`WETH.e Balance : ${ethers.utils.formatEther((await WETHeContract.balanceOf(owner.address)).toString())}`)

  await waitUser('Sucessfully deposited to pool. Press any key to swap 5 ETH to WETH.e')

  // Swap - Get some WETHe
  await poolContract
    .connect(owner)
    .swap(ETHTokenAddress, WETHeTokenAddress, parseUnits('5', 18), 0, owner.address, deadline)

  console.log(`ETH Balance : ${ethers.utils.formatEther((await ETHContract.balanceOf(owner.address)).toString())}`)
  console.log(`WETH.e Balance : ${ethers.utils.formatEther((await WETHeContract.balanceOf(owner.address)).toString())}`)

  await waitUser('Sucessfully swapped 5 ETH to WETH.e. Press any key to swap 20 WETH.e to ETH')

  // Swap - Get some ETH
  await poolContract
    .connect(owner)
    .swap(WETHeTokenAddress, ETHTokenAddress, parseUnits('20', 18), 0, owner.address, deadline)

  console.log(`ETH Balance : ${ethers.utils.formatEther((await ETHContract.balanceOf(owner.address)).toString())}`)
  console.log(`WETH.e Balance : ${ethers.utils.formatEther((await WETHeContract.balanceOf(owner.address)).toString())}`)
  await waitUser('Sucessfully swapped 20 WETHe to ETH. Press any key to end the script.')

  console.log(`ETH Balance : ${ethers.utils.formatEther((await ETHContract.balanceOf(owner.address)).toString())}`)
  console.log(`WETH.e Balance : ${ethers.utils.formatEther((await WETHeContract.balanceOf(owner.address)).toString())}`)
}

// Wait User function
function waitUser(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close()
      resolve(ans)
    })
  )
}

runDemo()
