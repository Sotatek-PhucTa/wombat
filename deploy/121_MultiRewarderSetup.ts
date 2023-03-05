import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { REWARDERS_MAP } from '../tokens.config'
import { getDeployedContract, isOwner, setRewarder } from '../utils'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre
  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  const masterWombat = await getDeployedContract('MasterWombatV3')
  for await (const [token, args] of Object.entries(REWARDERS_MAP[hre.network.name] || {})) {
    deployments.log(token)
    const name = `MultiRewarderPerSec_V3_${token}`
    const rewarder = await getDeployedContract('MultiRewarderPerSec', name)
    if (await isOwner(masterWombat, owner.address)) {
      deployments.log('rewarder', rewarder.address, args.lpToken)
      await setRewarder(masterWombat, owner, args.lpToken, rewarder.address)
      deployments.log(`setRewarder for ${name} (${rewarder.address}) complete.`)
    } else {
      deployments.log(
        `User ${owner.address} does not own MasterWombat. Please call setRewarder in multi-sig. Rewarder: ${rewarder.address}. LP: ${args.lpToken}.`
      )
    }
  }
}

export default deployFunc
deployFunc.dependencies = ['MultiRewarderPerSec']
deployFunc.tags = ['MultiRewarderSetup']
