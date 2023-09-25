import { deployments, ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Token, getTokenAddress } from '../config/token'
import { deployProxy, getProxyAdminOwner } from '../utils/deploy'
import { getCurrentNetwork } from '../types/network'

const contractName = 'MasterWombatV3'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()

  deployments.log(`Step 010. Deploying on : ${getCurrentNetwork()} with account : ${deployer}`)

  const wombatToken = await getTokenAddress(Token.WOM)
  const deployResult = await deployProxy(contractName, contractName, deployer, await getProxyAdminOwner(), [
    wombatToken,
    ethers.constants.AddressZero,
    ethers.constants.AddressZero,
    375,
  ])

  return deployResult
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['WombatToken']
deployFunc.skip = async () => {
  const bmw = await deployments.getOrNull('BoostedMasterWombat')
  return bmw != null
}
