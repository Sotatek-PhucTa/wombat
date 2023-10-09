import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getCurrentNetwork } from '../types/network'
import { getNamedAccounts } from 'hardhat'
import { logVerifyCommand } from '../utils'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre
  const { deployer } = await getNamedAccounts()

  deployments.log(`Step 103. Deploying on: ${getCurrentNetwork()}...`)

  const deployResult = await deployments.deploy('VeWom_Implementation', {
    from: deployer,
    contract: 'VeWom',
    log: true,
    skipIfAlreadyDeployed: false,
  })

  deployments.log('Contract address:', deployResult.address)
  deployments.log('Please turn off skipIfAlreadyDeployed')
  logVerifyCommand(deployResult)
}

export default deployFunc
deployFunc.tags = ['VeWom_Implementation']
