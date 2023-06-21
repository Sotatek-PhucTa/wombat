import { deployments, getNamedAccounts, network } from 'hardhat'
import { logVerifyCommand } from '../utils'

export const contractName = 'CoreV3'

const deployFunc = async function () {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  deployments.log(`Step 003. Deploying on : ${network.name} with account : ${deployer}`)
  const coreV3DeployResult = await deploy('CoreV3', { from: deployer, log: true, skipIfAlreadyDeployed: false })

  logVerifyCommand(coreV3DeployResult)
}

export default deployFunc
deployFunc.tags = [contractName]
