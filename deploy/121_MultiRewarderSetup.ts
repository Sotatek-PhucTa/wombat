import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { REWARDERS_MAP } from '../tokens.config'
import { getAddress, getDeployedContract, isOwner, setRewarder } from '../utils'
import { Network } from '../types'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()
  const owner = await ethers.getSigner(deployer)

  const masterWombat = await getDeployedContract('MasterWombatV3')
  for await (const [token, rewarderConfig] of Object.entries(REWARDERS_MAP[hre.network.name as Network] || {})) {
    const name = `MultiRewarderPerSec_V3_${token}`
    deployments.log(`Setting up ${name}`)
    const lpTokenAddress = await getAddress(rewarderConfig.lpToken)
    const rewarder = await getDeployedContract('MultiRewarderPerSec', name)
    if (await isOwner(masterWombat, owner.address)) {
      deployments.log('rewarder', rewarder.address, rewarderConfig.lpToken)
      await setRewarder(masterWombat, owner, lpTokenAddress, rewarder.address)
      deployments.log(`setRewarder for ${name} (${rewarder.address}) complete.`)
    } else {
      deployments.log(
        `User ${owner.address} does not own MasterWombat. Please call setRewarder in multi-sig. Rewarder: ${rewarder.address}. LP: ${rewarderConfig.lpToken}.`
      )
    }
  }
}

export default deployFunc
deployFunc.dependencies = ['MultiRewarderPerSec']
deployFunc.tags = ['MultiRewarderSetup']
