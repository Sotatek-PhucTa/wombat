import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getRewarders } from '../config/emissions.config'
import { getAddress, getDeployedContract, isOwner, setRewarder } from '../utils'
import { getRewarderDeploymentName } from '../utils/deploy'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()
  const owner = await ethers.getSigner(deployer)

  const masterWombat = await getDeployedContract('MasterWombatV3')
  for await (const [token, rewarderConfig] of Object.entries(await getRewarders())) {
    const name = getRewarderDeploymentName(token)
    deployments.log(`Setting up ${name}`)
    const lpTokenAddress = await getAddress(rewarderConfig.lpToken)
    const rewarder = await getDeployedContract('MultiRewarderPerSec', name)
    if (await isOwner(masterWombat, owner.address)) {
      deployments.log('rewarder', rewarder.address, 'for lp', rewarderConfig.lpToken)
      await setRewarder(masterWombat, owner, lpTokenAddress, rewarder.address)
      deployments.log(`setRewarder for ${name} (${rewarder.address}) complete.`)
    } else {
      deployments.log(
        `User ${owner.address} does not own MasterWombat. Please call setRewarder in multi-sig. Rewarder: ${rewarder.address}. LP: ${lpTokenAddress}.`
      )
    }
  }
}

export default deployFunc
deployFunc.dependencies = ['MultiRewarderPerSec']
deployFunc.tags = ['MultiRewarderSetup']
