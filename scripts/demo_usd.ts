// Demo for Wombat team
// Usage : npx hardhat run ./scripts/demo.ts --network "bsc"

// TODO : add withdraw and deposit, test the withdraw method

import { deployments, ethers } from 'hardhat'
import { parseUnits } from '@ethersproject/units'
import readline = require('readline')
// import { usdc } from '../test/helpers/helper'

async function runDemo() {
  // Wait for all deployments to finish
  await deployments.all()

  // Setup deployed address constants
  const poolAddress = await (await deployments.get('Pool')).address
  const DAITokenAddress = await (await deployments.get('DAI.e')).address
  const USDCTokenAddress = await (await deployments.get('USDC.e')).address
  const USDTTokenAddress = await (await deployments.get('USDT.e')).address

  // Set deadline for calls
  const deadline = (await ethers.provider.getBlock('latest')).timestamp + 5000 // 5 secs after last block
  // const lastBlockTime = (await ethers.provider.getBlock('latest')).timestamp

  // Get Signers
  const [owner] = await ethers.getSigners()

  // Get DAI, USDC and USDT token deployed instances
  const DAIContract = await ethers.getContractAt('TestERC20', DAITokenAddress, owner)
  const USDCContract = await ethers.getContractAt('TestERC20', USDCTokenAddress, owner)
  const USDTContract = await ethers.getContractAt('TestERC20', USDTTokenAddress, owner)

  await waitUser('Demo initialized. Press any key to get faucet USD Tokens and approve spending by pool')

  // Get faucet USD
  await DAIContract.faucet(parseUnits('1000000', 18))
  await USDCContract.faucet(parseUnits('1000000', 6))
  await USDTContract.faucet(parseUnits('1000000', 6))

  // Get Pool deployed instance
  const poolContract = await ethers.getContractAt('Pool', poolAddress, owner)

  // Approve tokens to be spent by pool before depositing (important)
  await DAIContract.connect(owner).approve(poolAddress, ethers.constants.MaxUint256)
  await USDCContract.connect(owner).approve(poolAddress, ethers.constants.MaxUint256)
  await USDTContract.connect(owner).approve(poolAddress, ethers.constants.MaxUint256)

  console.log(`DAI Balance : ${ethers.utils.formatEther((await DAIContract.balanceOf(owner.address)).toString())}`)
  console.log(`USDT Balance : ${ethers.utils.formatUnits((await USDTContract.balanceOf(owner.address)).toString(), 6)}`)
  console.log(`USDC Balance : ${ethers.utils.formatUnits((await USDCContract.balanceOf(owner.address)).toString(), 6)}`)

  await waitUser('Got Faucet USD. Press any key to deposit 500000 of each to pool')

  // Deposit DAI, USDC and USDT
  await poolContract.connect(owner).deposit(DAITokenAddress, parseUnits('500000', 18), owner.address, deadline)
  await poolContract.connect(owner).deposit(USDTTokenAddress, parseUnits('500000', 6), owner.address, deadline)
  await poolContract.connect(owner).deposit(USDCTokenAddress, parseUnits('500000', 6), owner.address, deadline)

  console.log(`DAI Balance : ${ethers.utils.formatEther((await DAIContract.balanceOf(owner.address)).toString())}`)
  console.log(`USDT Balance : ${ethers.utils.formatUnits((await USDTContract.balanceOf(owner.address)).toString(), 6)}`)
  console.log(`USDC Balance : ${ethers.utils.formatUnits((await USDCContract.balanceOf(owner.address)).toString(), 6)}`)

  await waitUser('Sucessfully deposited to pool. Press any key to swap 500 USDT to DAI')

  // Swap - Get some DAI
  await poolContract
    .connect(owner)
    .swap(USDTTokenAddress, DAITokenAddress, parseUnits('500', 6), 0, owner.address, deadline)

  console.log(`DAI Balance : ${ethers.utils.formatEther((await DAIContract.balanceOf(owner.address)).toString())}`)
  console.log(`USDT Balance : ${ethers.utils.formatUnits((await USDTContract.balanceOf(owner.address)).toString(), 6)}`)
  console.log(`USDC Balance : ${ethers.utils.formatUnits((await USDCContract.balanceOf(owner.address)).toString(), 6)}`)

  await waitUser('Sucessfully swapped 500 USDT to DAI. Press any key to swap 1000 DAI to USDC')

  // Swap - Get some USDC
  await poolContract
    .connect(owner)
    .swap(DAITokenAddress, USDCTokenAddress, parseUnits('1000', 18), 0, owner.address, deadline)

  console.log(`DAI Balance : ${ethers.utils.formatEther((await DAIContract.balanceOf(owner.address)).toString())}`)
  console.log(`USDT Balance : ${ethers.utils.formatUnits((await USDTContract.balanceOf(owner.address)).toString(), 6)}`)
  console.log(`USDC Balance : ${ethers.utils.formatUnits((await USDCContract.balanceOf(owner.address)).toString(), 6)}`)

  await waitUser('Sucessfully swapped 1000 DAI to USDC. Press any key to swap 3000 USDC to USDT')

  // Swap - Get some USDT
  await poolContract
    .connect(owner)
    .swap(USDCTokenAddress, USDTTokenAddress, parseUnits('3000', 6), 0, owner.address, deadline)

  console.log(`DAI Balance : ${ethers.utils.formatEther((await DAIContract.balanceOf(owner.address)).toString())}`)
  console.log(`USDT Balance : ${ethers.utils.formatUnits((await USDTContract.balanceOf(owner.address)).toString(), 6)}`)
  console.log(`USDC Balance : ${ethers.utils.formatUnits((await USDCContract.balanceOf(owner.address)).toString(), 6)}`)

  await waitUser('Sucessfully swapped 3000 USDC to USDT. Press any key to swap 250k USDT to DAI.')

  // Swap - Get more more DAI
  await poolContract
    .connect(owner)
    .swap(USDTTokenAddress, DAITokenAddress, parseUnits('250000', 6), 0, owner.address, deadline)

  console.log(`DAI Balance : ${ethers.utils.formatEther((await DAIContract.balanceOf(owner.address)).toString())}`)
  console.log(`USDT Balance : ${ethers.utils.formatUnits((await USDTContract.balanceOf(owner.address)).toString(), 6)}`)
  console.log(`USDC Balance : ${ethers.utils.formatUnits((await USDCContract.balanceOf(owner.address)).toString(), 6)}`)

  await waitUser('Sucessfully swapped 250000 USDT to DAI. Press any key to end the script.')

  console.log(`DAI Balance : ${ethers.utils.formatEther((await DAIContract.balanceOf(owner.address)).toString())}`)
  console.log(`USDT Balance : ${ethers.utils.formatUnits((await USDTContract.balanceOf(owner.address)).toString(), 6)}`)
  console.log(`USDC Balance : ${ethers.utils.formatUnits((await USDCContract.balanceOf(owner.address)).toString(), 6)}`)
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
