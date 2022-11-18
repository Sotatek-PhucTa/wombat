import { BigNumber } from 'ethers'
import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { REWARDERS_MAP } from '../tokens.config'
import { confirmTxn } from '../utils'

const contractName = 'MultiRewarderPerSec'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()
  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  const masterWombat = await deployments.get('MasterWombatV3')

  console.log(`Step 120. Deploying on: ${hre.network.name}...`)

  for await (const [token, rewarder] of Object.entries(REWARDERS_MAP[hre.network.name])) {
    const deadline = getDeadlineFromNow(rewarder.secondsToStart)

    /// Deploy pool
    const deployResult = await deploy(`MultiRewarderPerSec_V3_${token}`, {
      from: deployer,
      contract: 'MultiRewarderPerSec',
      log: true,
      skipIfAlreadyDeployed: true,
      args: [masterWombat.address, rewarder.lpToken, deadline, rewarder.rewardToken, rewarder.tokenPerSec],
    })

    const contract = await ethers.getContractAt(contractName, deployResult.address)

    if (deployResult.newlyDeployed) {
      console.log(`Transferring operator of ${deployResult.address} to ${owner.address}...`)
      // The operator of the rewarder contract can set and update reward rates
      await confirmTxn(contract.connect(owner).setOperator(owner.address))
      console.log(`Transferring ownership of ${deployResult.address} to ${multisig}...`)
      // The owner of the rewarder contract can add new reward tokens and withdraw them
      await confirmTxn(contract.connect(owner).transferOwnership(multisig))
      console.log(`MultiRewarderPerSec_V3_${token} Deployment complete.`)
    }

    const address = deployResult.address
    console.log(
      `To verify, run: hardhat verify --network ${hre.network.name} ${address} ${masterWombat.address} ${
        rewarder.lpToken
      } ${BigNumber.from(deadline)._hex} ${rewarder.rewardToken} ${rewarder.tokenPerSec._hex}`
    )
  }
}

function getDeadlineFromNow(secondSince: string | number): number {
  return Math.round(Date.now() / 1000) + Number(secondSince)
}

export default deployFunc
deployFunc.dependencies = ['MasterWombatV3']
deployFunc.tags = [contractName]
