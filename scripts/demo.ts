import { deployments, ethers } from 'hardhat'
import { parseUnits } from '@ethersproject/units'

async function run() {
  // Wait for all deployments to finish
  await deployments.all()

  console.log('Demo running...')

  // Setup deployed address constants
  const poolAddress = await (await deployments.get('Pool')).address
  const BUSDTokenAddress = await (await deployments.get('BUSD')).address
  const USDCTokenAddress = await (await deployments.get('USDC')).address
  const USDTTokenAddress = await (await deployments.get('USDT')).address
  const vUSDCTokenAddress = await (await deployments.get('vUSDC')).address

  const BUSDAssetAddress = await (await deployments.get('Asset_BUSD')).address
  const USDCAssetAddress = await (await deployments.get('Asset_USDC')).address
  const USDTAssetAddress = await (await deployments.get('Asset_USDT')).address
  const vUSDCAssetAddress = await (await deployments.get('Asset_vUSDC')).address

  // Set deadline for calls
  const deadline = (await ethers.provider.getBlock('latest')).timestamp + 600000 // 600 secs after last block

  // Get Signers
  const [owner, user1, user2] = await ethers.getSigners()

  // Get their token deployed instances
  const BUSDContract = await ethers.getContractAt('TestERC20', BUSDTokenAddress, owner)
  const USDCContract = await ethers.getContractAt('TestERC20', USDCTokenAddress, owner)
  const USDTContract = await ethers.getContractAt('TestERC20', USDTTokenAddress, owner)
  const vUSDCContract = await ethers.getContractAt('TestERC20', vUSDCTokenAddress, owner)

  const AssetBUSDContract = await ethers.getContractAt('Asset', BUSDAssetAddress, owner)
  const AssetUSDCContract = await ethers.getContractAt('Asset', USDCAssetAddress, owner)
  const AssetUSDTContract = await ethers.getContractAt('Asset', USDTAssetAddress, owner)
  const AssetvUSDCContract = await ethers.getContractAt('Asset', vUSDCAssetAddress, owner)

  // Get faucet USD
  await (await BUSDContract.connect(user1).faucet(parseUnits('10000', 18))).wait()
  await (await USDCContract.connect(user1).faucet(parseUnits('10000', 18))).wait()
  await (await USDTContract.connect(user1).faucet(parseUnits('10000', 18))).wait()
  await (await vUSDCContract.connect(user2).faucet(parseUnits('10000', 8))).wait() // user 2 gets vUSDC only

  console.log('After getting 10k faucet of each')
  console.log(`BUSD Balance : ${ethers.utils.formatEther((await BUSDContract.balanceOf(user1.address)).toString())}`)
  console.log(`USDT Balance : ${ethers.utils.formatUnits((await USDTContract.balanceOf(user1.address)).toString())}`)
  console.log(`USDC Balance : ${ethers.utils.formatUnits((await USDCContract.balanceOf(user1.address)).toString())}`)
  console.log(
    `vUSDC Balance : ${ethers.utils.formatUnits((await vUSDCContract.balanceOf(user2.address)).toString(), 8)}`
  )

  // Get Pool deployed instance
  const poolContract = await ethers.getContractAt('Pool', poolAddress, owner)

  // Approve tokens to be spent by pool before depositing (important)
  await (await BUSDContract.connect(user1).approve(poolAddress, ethers.constants.MaxUint256)).wait()
  await (await USDCContract.connect(user1).approve(poolAddress, ethers.constants.MaxUint256)).wait()
  await (await USDTContract.connect(user1).approve(poolAddress, ethers.constants.MaxUint256)).wait()
  await (await vUSDCContract.connect(user2).approve(poolAddress, ethers.constants.MaxUint256)).wait()

  // Deposit BUSD, USDC, USDT, and vUSDC
  console.log('Depositing...')
  await (
    await poolContract.connect(user1).deposit(BUSDTokenAddress, parseUnits('10000', 18), user1.address, deadline)
  ).wait()
  await (
    await poolContract.connect(user1).deposit(USDTTokenAddress, parseUnits('10000', 18), user1.address, deadline)
  ).wait()
  await (
    await poolContract.connect(user1).deposit(USDCTokenAddress, parseUnits('10000', 18), user1.address, deadline)
  ).wait()
  await (
    await poolContract.connect(user2).deposit(vUSDCTokenAddress, parseUnits('1000', 8), user2.address, deadline)
  ).wait()

  // console.log('After depositing 1k-10k each')
  console.log(`BUSD Balance : ${ethers.utils.formatEther((await BUSDContract.balanceOf(user1.address)).toString())}`)
  console.log(`USDT Balance : ${ethers.utils.formatUnits((await USDTContract.balanceOf(user1.address)).toString())}`)
  console.log(`USDC Balance : ${ethers.utils.formatUnits((await USDCContract.balanceOf(user1.address)).toString())}`)
  console.log(
    `vUSDC Balance : ${ethers.utils.formatUnits((await vUSDCContract.balanceOf(user2.address)).toString(), 8)}`
  )

  // Swap - Get some vUSDC with BUSD from Pool
  console.log('Swapping...')
  await (
    await poolContract
      .connect(user1)
      .swap(BUSDTokenAddress, vUSDCTokenAddress, parseUnits('100', 18), parseUnits('90', 8), user1.address, deadline)
  ).wait()

  console.log('After swapping 100 BUSD to vUSDC')
  console.log(`BUSD Balance : ${ethers.utils.formatEther((await BUSDContract.balanceOf(user1.address)).toString())}`)
  console.log(
    `vUSDC Balance : ${ethers.utils.formatUnits((await vUSDCContract.balanceOf(user1.address)).toString(), 8)}`
  )

  // Swap - Get some USDT with USDC from Pool
  await (
    await poolContract
      .connect(user1)
      .swap(USDCTokenAddress, USDTTokenAddress, parseUnits('1500', 18), parseUnits('1350', 18), user1.address, deadline)
  ).wait()

  console.log('After swapping 1500 USDC to USDT')
  console.log(`USDT Balance : ${ethers.utils.formatUnits((await USDTContract.balanceOf(user1.address)).toString())}`)
  console.log(`USDC Balance : ${ethers.utils.formatUnits((await USDCContract.balanceOf(user1.address)).toString())}`)

  // Withdraw - Return some LP-BUSD to get BUSD back from Pool
  console.log('Withdrawing...')
  // // Approve tokens to be spent by pool before depositing
  await (await AssetBUSDContract.connect(user1).approve(poolAddress, ethers.constants.MaxUint256)).wait()
  await (
    await poolContract
      .connect(user1)
      .withdraw(BUSDTokenAddress, parseUnits('4500', 18), parseUnits('3000', 18), user1.address, deadline)
  ).wait()

  await (await AssetUSDCContract.connect(user1).approve(poolAddress, ethers.constants.MaxUint256)).wait()
  await (
    await poolContract
      .connect(user1)
      .withdraw(USDCTokenAddress, parseUnits('4500', 18), parseUnits('4500', 18), user1.address, deadline)
  ).wait()

  await (await AssetUSDTContract.connect(user1).approve(poolAddress, ethers.constants.MaxUint256)).wait()
  await (
    await poolContract
      .connect(user1)
      .withdraw(USDTTokenAddress, parseUnits('4500', 18), parseUnits('4500', 18), user1.address, deadline)
  ).wait()

  await (await AssetvUSDCContract.connect(user2).approve(poolAddress, ethers.constants.MaxUint256)).wait()
  await (
    await poolContract
      .connect(user2)
      .withdraw(vUSDCTokenAddress, parseUnits('450', 8), parseUnits('450', 8), user2.address, deadline)
  ).wait()

  console.log('Final balances')
  console.log(`BUSD Balance : ${ethers.utils.formatEther((await BUSDContract.balanceOf(user1.address)).toString())}`)
  console.log(`USDT Balance : ${ethers.utils.formatUnits((await USDTContract.balanceOf(user1.address)).toString())}`)
  console.log(`USDC Balance : ${ethers.utils.formatUnits((await USDCContract.balanceOf(user1.address)).toString())}`)
  console.log(
    `vUSDC Balance : ${ethers.utils.formatUnits((await vUSDCContract.balanceOf(user1.address)).toString(), 8)}`
  )
  console.log(
    `vUSDC Balance : ${ethers.utils.formatUnits((await vUSDCContract.balanceOf(user2.address)).toString(), 8)}`
  )

  console.log('Demo complete.')
}

// Run the script
run()
