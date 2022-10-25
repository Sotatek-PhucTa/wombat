import { BigNumber } from 'ethers'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { REWARDERS_MAP } from '../tokens.config'

const contractName = 'MultiRewarderPerSec'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const masterWombat = await deployments.get('MasterWombatV2')

  console.log(`Step 120. Deploying on: ${hre.network.name}...`)

  for await (const [token, rewarder] of Object.entries(REWARDERS_MAP[hre.network.name])) {
    const deadline = getDeadlineFromNow(rewarder.secondsToStart)

    /// Deploy pool
    const deployResult = await deploy(`MultiRewarderPerSec_${token}`, {
      from: deployer,
      contract: 'MultiRewarderPerSec',
      log: true,
      skipIfAlreadyDeployed: true,
      args: [masterWombat.address, rewarder.lpToken, deadline, rewarder.rewardToken, rewarder.tokenPerSec],
    })

    if (deployResult.newlyDeployed) {
      console.log(`MultiRewarderPerSec_${token} Deployment complete.`)
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
deployFunc.tags = [contractName]
