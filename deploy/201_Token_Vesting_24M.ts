import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'
import { parseUnits } from '@ethersproject/units'
import beneficiaries from '../beneficiaries.json' // to be filled

const contractName = 'TokenVesting24M'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()

  const [owner, user1, user2] = await ethers.getSigners()

  deployments.log(`Step 201. Deploying on : ${hre.network.name} with account : ${deployer}`)
  return

  // Get deployed WOM token instance
  const womToken = await deployments.get('WombatToken')
  const womTokenContract = await ethers.getContractAt('WombatERC20', womToken.address)

  // get last block time and init variables
  const lastBlock = await ethers.provider.getBlock('latest')
  const lastBlockTime = lastBlock.timestamp
  const threeMonthsCliff = (60 * 60 * 24 * 365) / 4 // 7884000,
  const oneDayCliff = 60 * 60 * 24 * 1

  const mainnetInit = {
    intervalSeconds: (60 * 60 * 24 * 365) / 12, // 15768000, i.e. 1 month unlock interval
    startCliff: threeMonthsCliff, // 3 months cliff
    startTimestamp: lastBlockTime + threeMonthsCliff, // 3 months 1 day later
    durationSeconds: 60 * 60 * 24 * 365 * 2, // 730 days, i.e. 2 years vesting period
  }
  const testnetInit = {
    intervalSeconds: 60 * 60 * 24 * 7, // 604800, i.e. 1 week unlock interval
    startCliff: oneDayCliff, // 1 day cliff
    startTimestamp: lastBlockTime + oneDayCliff, // 1 day later
    durationSeconds: 60 * 60 * 24 * 70, // 70 days, i.e. 10 weeks vesting period
  }

  /// Deploy token vesting
  const tokenVestingDeployResult = await deploy(contractName, {
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
    if (
      hre.network.name == 'localhost' ||
      hre.network.name == 'hardhat' ||
      hre.network.name == 'bsc_testnet' ||
      hre.network.name == 'bsc_mainnet'
    ) {
      // Get freshly deployed Token Vesting contract
      const tokenVesting = await ethers.getContractAt('TokenVesting', tokenVestingDeployResult.address)

      // Check vested token
      const vestedTokenAddress = await tokenVesting.vestedToken()
      deployments.log(`24 Month Vested Token Address is : ${vestedTokenAddress}`)
      deployments.log(`Deployer account is: ${deployer}`)

      if (hre.network.name == 'bsc_mainnet') {
        // set WOM allocation for beneficiaries
        const beneficiariesList = beneficiaries['24M']
        for (let i = 0; i < beneficiariesList.length; i++) {
          const setBeneficiaryTxn = await tokenVesting
            .connect(owner)
            .setBeneficiary(beneficiariesList[i].address, parseUnits(beneficiariesList[i].amount, 18))
          await setBeneficiaryTxn.wait()
          deployments.log(
            `Added Beneficiary ${beneficiariesList[i].address} with amount ${beneficiariesList[i].amount}`
          )
        }

        // transfer token vesting contract ownership to Gnosis Safe
        deployments.log(`Transferring ownership of ${tokenVestingDeployResult.address} to ${multisig}...`)
        // The owner of the token vesting contract is very powerful!
        const transferOwnershipTxn = await tokenVesting.connect(owner).transferOwnership(multisig)
        await transferOwnershipTxn.wait()
        deployments.log(`Transferred ownership of ${tokenVestingDeployResult.address} to:`, multisig)

        // Query totalAllocationBalance and transfer exact WOM tokens to vesting contract via multi-sig
        // To be performed by Gnosis Safe [mainnet only]
      } else {
        await tokenVesting.connect(owner).setBeneficiary(user1.address, parseUnits('10000', 18))
        await tokenVesting.connect(owner).setBeneficiary(user2.address, parseUnits('1000.12345678', 18))

        // transfer exact WOM tokens to vesting contract
        const transferWomTxn = await womTokenContract
          .connect(owner)
          .transfer(tokenVesting.address, parseUnits('11000.12345678', 18))
        await transferWomTxn.wait()
      }

      // Check init deploy values
      const start = await tokenVesting.start()
      const duration = await tokenVesting.duration()
      const totalUnderlyingBalance = await tokenVesting.totalUnderlyingBalance()
      const beneficiaryCount = await tokenVesting.beneficiaryCount()
      const totalAllocationBalance = await tokenVesting.totalAllocationBalance()
      deployments.log(`Start timestamp is : ${start}`)
      deployments.log(`Duration in seconds is : ${duration}`)
      deployments.log(`Total underlying WOM balance is : ${totalUnderlyingBalance}`)
      deployments.log(`Beneficiary count is : ${beneficiaryCount}`)
      deployments.log(`Total Allocation Balance is : ${totalAllocationBalance}`)
    }
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['WombatToken']
deployFunc.skip = async () => true
