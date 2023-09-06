import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getCurrentNetwork } from '../types/network'
import { getNamedAccounts } from 'hardhat'
import { logVerifyCommand } from '../utils'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre
  const { deployer } = await getNamedAccounts()

  deployments.log(`Step 106. Deploying on: ${getCurrentNetwork()}...`)

  const deployResult = await deployments.deploy('BoostedMasterWombat_Implementation', {
    from: deployer,
    contract: 'BoostedMasterWombat',
    log: true,
    skipIfAlreadyDeployed: true,
  })

  deployments.log('Contract address:', deployResult.address)
  logVerifyCommand(deployResult)
}

export default deployFunc
deployFunc.tags = ['BoostedMasterWombat_Implementation']
