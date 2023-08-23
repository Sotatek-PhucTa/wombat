import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getRewarders } from '../config/emissions.config'
import { getLatestMasterWombat, logVerifyCommand } from '../utils'
import { deployRewarderOrBribe, getRewarderDeploymentName } from '../utils/deploy'
import { getCurrentNetwork } from '../types/network'

const contractName = 'MultiRewarderPerSec'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre
  deployments.log(`Step 120. Deploying on: ${getCurrentNetwork()}...`)

  const masterWombat = await getLatestMasterWombat()
  for await (const [lpToken, rewarderConfig] of Object.entries(await getRewarders())) {
    const deployResult = await deployRewarderOrBribe(
      'MultiRewarderPerSec',
      getRewarderDeploymentName,
      lpToken,
      masterWombat.address,
      rewarderConfig
    )
    logVerifyCommand(deployResult)
  }
}

export default deployFunc
deployFunc.dependencies = ['MasterWombatV3']
deployFunc.tags = [contractName]
