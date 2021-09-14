// Usage : npx hardhat run ./scripts/bootstrap.ts --network <network>
// For bsc : npx hardhat run ./scripts/bootstrap.ts --network bsc

import { deployments, ethers } from 'hardhat'
import { parseUnits } from '@ethersproject/units'

async function run() {
  // Wait for all deployments to finish
  await deployments.all()

  console.log('Bootstrapping...')

  // Setup deployed address constants
  const poolAddress = await (await deployments.get('Pool')).address
  const DAITokenAddress = await (await deployments.get('DAI.e')).address
  const USDCTokenAddress = await (await deployments.get('USDC.e')).address
  const USDTTokenAddress = await (await deployments.get('USDT.e')).address
  const DAIAssetAddress = await (await deployments.get('Asset_DAI.e')).address
  const USDCAssetAddress = await (await deployments.get('Asset_USDC.e')).address
  const USDTAssetAddress = await (await deployments.get('Asset_USDT.e')).address
  // console.log(DAIAssetAddress)
  // console.log(USDCAssetAddress)
  // console.log(USDTAssetAddress)

  // Set deadline for calls
  const deadline = (await ethers.provider.getBlock('latest')).timestamp + 500000 // 500 secs after last block

  // Get Signers
  const [owner] = await ethers.getSigners()

  // Get DAI, USDC and USDT token deployed instances
  const DAIContract = await ethers.getContractAt('TestERC20', DAITokenAddress, owner)
  const USDCContract = await ethers.getContractAt('TestERC20', USDCTokenAddress, owner)
  const USDTContract = await ethers.getContractAt('TestERC20', USDTTokenAddress, owner)
  const AssetDAIContract = await ethers.getContractAt('Asset', DAIAssetAddress, owner)
  const AssetUSDCContract = await ethers.getContractAt('Asset', USDCAssetAddress, owner)
  const AssetUSDTContract = await ethers.getContractAt('Asset', USDTAssetAddress, owner)

  // console.log(AssetDAIContract)
  // console.log(AssetUSDCContract)
  // console.log(AssetUSDTContract)

  // // Get faucet USD
  await DAIContract.faucet(parseUnits('10000', 18))
  await USDCContract.faucet(parseUnits('10000', 6))
  await USDTContract.faucet(parseUnits('10000', 6))

  console.log('After getting 10k faucet of each')
  console.log(`DAI Balance : ${ethers.utils.formatEther((await DAIContract.balanceOf(owner.address)).toString())}`)
  console.log(`USDT Balance : ${ethers.utils.formatUnits((await USDTContract.balanceOf(owner.address)).toString(), 6)}`)
  console.log(`USDC Balance : ${ethers.utils.formatUnits((await USDCContract.balanceOf(owner.address)).toString(), 6)}`)

  // Get Pool deployed instance
  const poolContract = await ethers.getContractAt('Pool', poolAddress, owner)

  // Approve tokens to be spent by pool before depositing (important)
  await DAIContract.connect(owner).approve(poolAddress, ethers.constants.MaxUint256)
  await USDCContract.connect(owner).approve(poolAddress, ethers.constants.MaxUint256)
  await USDTContract.connect(owner).approve(poolAddress, ethers.constants.MaxUint256)

  // Deposit DAI, USDC and USDT
  await poolContract.connect(owner).deposit(DAITokenAddress, parseUnits('5000', 18), owner.address, deadline)
  await poolContract.connect(owner).deposit(USDTTokenAddress, parseUnits('5000', 6), owner.address, deadline)
  await poolContract.connect(owner).deposit(USDCTokenAddress, parseUnits('5000', 6), owner.address, deadline)

  console.log('After depositing 5k of each')
  console.log(`DAI Balance : ${ethers.utils.formatEther((await DAIContract.balanceOf(owner.address)).toString())}`)
  console.log(`USDT Balance : ${ethers.utils.formatUnits((await USDTContract.balanceOf(owner.address)).toString(), 6)}`)
  console.log(`USDC Balance : ${ethers.utils.formatUnits((await USDCContract.balanceOf(owner.address)).toString(), 6)}`)

  // Swap - Get some DAI from Pool
  await poolContract
    .connect(owner)
    .swap(USDTTokenAddress, DAITokenAddress, parseUnits('100', 6), 0, owner.address, deadline)

  console.log('After swaping 100 USDT to DAI')
  console.log(`DAI Balance : ${ethers.utils.formatEther((await DAIContract.balanceOf(owner.address)).toString())}`)
  console.log(`USDT Balance : ${ethers.utils.formatUnits((await USDTContract.balanceOf(owner.address)).toString(), 6)}`)
  console.log(`USDC Balance : ${ethers.utils.formatUnits((await USDCContract.balanceOf(owner.address)).toString(), 6)}`)

  // Swap - Get some DAI from Pool
  await poolContract
    .connect(owner)
    .swap(USDCTokenAddress, DAITokenAddress, parseUnits('150', 6), 0, owner.address, deadline)

  console.log('After swaping 150 USDC to DAI')
  console.log(`DAI Balance : ${ethers.utils.formatEther((await DAIContract.balanceOf(owner.address)).toString())}`)
  console.log(`USDT Balance : ${ethers.utils.formatUnits((await USDTContract.balanceOf(owner.address)).toString(), 6)}`)
  console.log(`USDC Balance : ${ethers.utils.formatUnits((await USDCContract.balanceOf(owner.address)).toString(), 6)}`)

  console.log('Withdrawing...')
  // // Approve tokens to be spent by pool before depositing
  await AssetDAIContract.connect(owner).approve(poolAddress, ethers.constants.MaxUint256)
  // console.log(receipt)

  await poolContract
    .connect(owner)
    .withdraw(DAITokenAddress, parseUnits('4500', 18), parseUnits('3000', 18), owner.address, deadline)

  await AssetUSDCContract.connect(owner).approve(poolAddress, ethers.constants.MaxUint256)
  await poolContract
    .connect(owner)
    .withdraw(USDCTokenAddress, parseUnits('4500', 6), parseUnits('4500', 6), owner.address, deadline)

  await AssetUSDTContract.connect(owner).approve(poolAddress, ethers.constants.MaxUint256)
  await poolContract
    .connect(owner)
    .withdraw(USDTTokenAddress, parseUnits('4500', 6), parseUnits('4500', 6), owner.address, deadline)
  // console.log(`TxHash: ${receipt.hash}`)

  console.log('Final balances')
  console.log(`DAI Balance : ${ethers.utils.formatEther((await DAIContract.balanceOf(owner.address)).toString())}`)
  console.log(`USDT Balance : ${ethers.utils.formatUnits((await USDTContract.balanceOf(owner.address)).toString(), 6)}`)
  console.log(`USDC Balance : ${ethers.utils.formatUnits((await USDCContract.balanceOf(owner.address)).toString(), 6)}`)
  console.log('Withdraw done')
}

// Run the script
run()
