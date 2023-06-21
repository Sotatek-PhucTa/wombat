import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { logVerifyCommand } from '../utils'
import { duration } from '../test/helpers'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer, multisig, jack, drop19, tj } = await getNamedAccounts()
  deployments.log(`Step 502. Deploying on: ${hre.network.name}...`)
  const deployResult = await deploy('TimelockController', {
    from: deployer,
    log: true,
    contract: 'TimelockController',
    args: [
      duration.days(1),
      /*proposers=*/ [multisig],
      /*executors=*/ [multisig, jack, drop19, tj],
      /*admin=*/ multisig,
    ],
    skipIfAlreadyDeployed: true,
  })

  deployments.log(`TimelockController Deployment complete.`)
  logVerifyCommand(deployResult)
}

export default deployFunc
deployFunc.dependencies = []
deployFunc.tags = ['TimelockController']
