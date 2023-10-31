import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getCurrentNetwork } from '../types/network'
import { logVerifyCommand } from '../utils'
import { Token, getTokenAddress } from '../config/token'
import { deployProxy, getProxyAdminOwner } from '../utils/deploy'
import { ethers } from 'hardhat'

const contractName = 'BoostedMasterWombat'
const tags = ['FirstClass']

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()

  deployments.log(`Step 011. Deploying on: ${getCurrentNetwork()}...`)

  const womAddr = await getTokenAddress(Token.WOM)

  const deployResult = await deployProxy(contractName, contractName, deployer, await getProxyAdminOwner(), [
    womAddr,
    ethers.constants.AddressZero,
    ethers.constants.AddressZero,
    375,
  ])

  if (deployResult.newlyDeployed) {
    deployments.log(`BoostedMasterWombat Deployment complete.`)
  }
}

export default deployFunc
deployFunc.tags = [contractName, ...tags]
