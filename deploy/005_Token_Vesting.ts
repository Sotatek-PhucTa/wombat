import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'
import { parseUnits } from '@ethersproject/units'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  // Get Signers
  const [owner, user1, user2] = await ethers.getSigners()

  console.log(`Step 005. Deploying on : ${hre.network.name} with account : ${deployer}`)

  // Get deployed WOM token instance
  const womToken = await deployments.get('WombatToken')
  const womTokenContract = await ethers.getContractAt('WombatERC20', womToken.address)

  // get last block time and init variables
  const lastBlock = await ethers.provider.getBlock('latest')
  const lastBlockTime = lastBlock.timestamp
  const thirtyDaysCliff = 60 * 60 * 24 * 30
  const oneDayCliff = 60 * 60 * 24 * 1

  const mainnetInit = {
    intervalSeconds: (60 * 60 * 24 * 365) / 2, // 15768000, i.e. 6 months unlock interval
    startCliff: thirtyDaysCliff, // 30 days cliff
    startTimestamp: lastBlockTime + thirtyDaysCliff, // 30 days later
    durationSeconds: 60 * 60 * 24 * 365 * 5, // 1825 days, i.e. 5 years vesting period
  }
  const testnetInit = {
    intervalSeconds: 60 * 60 * 24 * 7, // 604800, i.e. 1 week unlock interval
    startCliff: oneDayCliff, // 1 day cliff
    startTimestamp: lastBlockTime + oneDayCliff, // 1 day later
    durationSeconds: 60 * 60 * 24 * 70, // 70 days, i.e. 10 weeks vesting period
  }

  /// Deploy token vesting
  const tokenVestingDeployResult = await deploy('TokenVesting', {
    from: deployer,
    contract: 'TokenVesting',
    args:
      hre.network.name == 'bsc_mainnet'
        ? [womToken.address, mainnetInit.startTimestamp, mainnetInit.durationSeconds, mainnetInit.intervalSeconds]
        : [womToken.address, testnetInit.startTimestamp, testnetInit.durationSeconds, testnetInit.intervalSeconds],
    log: true,
    skipIfAlreadyDeployed: true,
  })

  if (tokenVestingDeployResult.newlyDeployed) {
    if (hre.network.name == 'localhost' || hre.network.name == 'hardhat' || hre.network.name == 'bsc_testnet') {
      // Get freshly deployed Pool contract
      const tokenVesting = await ethers.getContractAt('TokenVesting', tokenVestingDeployResult.address)

      // Check vested token
      const vestedTokenAddress = await tokenVesting.vestedToken()
      console.log(`Vested Token Address is : ${vestedTokenAddress}`)
      console.log(`Deployer account is: ${deployer}`)

      // set user1 and user2 as beneficiary WOM allocation
      await tokenVesting.connect(owner).setBeneficiary(user1.address, parseUnits('10000', 18))
      await tokenVesting.connect(owner).setBeneficiary(user2.address, parseUnits('1000.12345678', 18))

      // transfer 11000.12345678 WOM tokens to vesting contract
      await womTokenContract.connect(owner).transfer(tokenVesting.address, parseUnits('11000.12345678', 18))

      // Check init deploy values
      const start = await tokenVesting.start()
      const duration = await tokenVesting.duration()
      const totalUnderlyingBalance = await tokenVesting.totalUnderlyingBalance()
      const beneficiaryCount = await tokenVesting.beneficiaryCount()
      const totalAllocationBalance = await tokenVesting.totalAllocationBalance()
      console.log(`Start timestamp is : ${start}`)
      console.log(`Duration in seconds is : ${duration}`)
      console.log(`Total underlying WOM balance is : ${totalUnderlyingBalance}`)
      console.log(`Beneficiary count is : ${beneficiaryCount}`)
      console.log(`Total Allocation Balance is : ${totalAllocationBalance}`)
    }
  }
}

export default deployFunc
deployFunc.tags = ['TokenVesting']
deployFunc.dependencies = ['WombatToken']
