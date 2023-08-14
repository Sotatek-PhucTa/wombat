import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getCurrentNetwork } from '../types/network'
import { deployUpgradeableBeacon } from '../utils/deploy'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre

  deployments.log(`Step 195. Deploying on: ${getCurrentNetwork()}...`)

  await deployUpgradeableBeacon('BoostedMultiRewarder')
  await deployUpgradeableBeacon('BribeV2')
}

export default deployFunc
deployFunc.tags = ['BribeRewarderBeacon']
