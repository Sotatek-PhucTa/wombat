import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { REWARDERS_MAP } from '../tokens.config'
import { confirmTxn, getAddress, getDeadlineFromNow, getDeployedContract, logVerifyCommand } from '../utils'
import { Network } from '../types'
import { getTokenAddress } from '../types/addresses/token'
import { assert } from 'chai'

const contractName = 'MultiRewarderPerSec'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()
  const owner = await ethers.getSigner(deployer)

  const masterWombat = await getDeployedContract('MasterWombatV3')

  deployments.log(`Step 120. Deploying on: ${hre.network.name}...`)

  for await (const [token, rewarderConfig] of Object.entries(REWARDERS_MAP[hre.network.name as Network] || {})) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const startTimestamp = rewarderConfig?.startTimestamp || getDeadlineFromNow(rewarderConfig.secondsToStart!)

    /// Deploy rewarder
    const name = `MultiRewarderPerSec_V3_${token}`
    const lpTokenAddress = await getAddress(rewarderConfig.lpToken)
    const rewardTokens =
      rewarderConfig.rewardToken != ethers.constants.AddressZero
        ? [rewarderConfig.rewardToken]
        : await Promise.all(rewarderConfig.rewardTokens.map((t) => getTokenAddress(t)))
    assert(rewardTokens.length > 0, `Empty rewardTokens for rewarder at ${token}`)
    const deployResult = await deploy(name, {
      from: deployer,
      contract: 'MultiRewarderPerSec',
      log: true,
      skipIfAlreadyDeployed: true,
      args: [masterWombat.address, lpTokenAddress, startTimestamp, rewardTokens[0], rewarderConfig.tokenPerSec],
    })
    const address = deployResult.address
    const contract = await ethers.getContractAt(contractName, address)

    if (deployResult.newlyDeployed) {
      /// Add remaining reward tokens
      if (rewardTokens.length > 1) {
        const rewarder = await getDeployedContract('MultiRewarderPerSec', name)
        for (const address of rewardTokens.slice(1)) {
          deployments.log(`${name} adding rewardToken: ${address}`)
          await confirmTxn(rewarder.connect(owner).addRewardToken(address, rewarderConfig.tokenPerSec))
        }
      }

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
