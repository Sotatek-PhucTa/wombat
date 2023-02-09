import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { REWARDERS_MAP } from '../tokens.config'
import { confirmTxn, getDeadlineFromNow, getDeployedContract, isOwner, logVerifyCommand, setRewarder } from '../utils'

const contractName = 'MultiRewarderPerSec'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()
  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  const masterWombat = await getDeployedContract('MasterWombatV3')

  deployments.log(`Step 120. Deploying on: ${hre.network.name}...`)

  for await (const [token, rewarder] of Object.entries(REWARDERS_MAP[hre.network.name])) {
    const startTimestamp = rewarder?.startTimestamp || getDeadlineFromNow(rewarder.secondsToStart!)

    /// Deploy pool
    const name = `MultiRewarderPerSec_V3_${token}`
    const deployResult = await deploy(name, {
      from: deployer,
      contract: 'MultiRewarderPerSec',
      log: true,
      skipIfAlreadyDeployed: true,
      args: [masterWombat.address, rewarder.lpToken, startTimestamp, rewarder.rewardToken, rewarder.tokenPerSec],
    })
    const address = deployResult.address
    const contract = await ethers.getContractAt(contractName, address)

    if (deployResult.newlyDeployed) {
      deployments.log(`Transferring operator of ${deployResult.address} to ${owner.address}...`)
      // The operator of the rewarder contract can set and update reward rates
      await confirmTxn(contract.connect(owner).setOperator(owner.address))
      deployments.log(`Transferring ownership of ${deployResult.address} to ${multisig}...`)
      // The owner of the rewarder contract can add new reward tokens and withdraw them
      await confirmTxn(contract.connect(owner).transferOwnership(multisig))
      deployments.log(`${name} Deployment complete.`)
    }

    logVerifyCommand(hre.network.name, deployResult)
  }
}

export default deployFunc
deployFunc.dependencies = ['MasterWombatV3']
deployFunc.tags = [contractName]
