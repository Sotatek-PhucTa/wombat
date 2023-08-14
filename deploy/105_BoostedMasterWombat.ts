import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getCurrentNetwork } from '../types/network'
import { logVerifyCommand } from '../utils'
import { Token, getTokenAddress } from '../config/token'
import { getProxyAdminOwner } from '../utils/deploy'
import { ethers } from 'hardhat'

const contractName = 'BoostedMasterWombat'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, upgrades, getNamedAccounts } = hre
  const { deployer } = await getNamedAccounts()

  deployments.log(`Step 105. Deploying on: ${getCurrentNetwork()}...`)

  const womAddr = await getTokenAddress(Token.WOM)

  const deployResult = await deployments.deploy(contractName, {
    from: deployer,
    log: true,
    contract: contractName,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: await getProxyAdminOwner(), // change to Gnosis Safe after all admin scripts are done
      proxyContract: 'OptimizedTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [womAddr, ethers.constants.AddressZero, ethers.constants.AddressZero, 375],
        },
      },
    },
  })
  const implAddr = await upgrades.erc1967.getImplementationAddress(deployResult.address)
  deployments.log('Contract address:', deployResult.address)
  deployments.log('Implementation address:', implAddr)

  if (deployResult.newlyDeployed) {
    deployments.log(`BoostedMasterWombat Deployment complete.`)
  }

  logVerifyCommand(deployResult)
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['Voter']
