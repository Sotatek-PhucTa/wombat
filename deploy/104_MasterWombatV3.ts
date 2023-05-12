import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Token, getTokenAddress } from '../config/token'
import { logVerifyCommand } from '../utils'

const contractName = 'MasterWombatV3'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()

  deployments.log(`Step 104. Deploying on : ${hre.network.name} with account : ${deployer}`)

  const wombatToken = await getTokenAddress(Token.WOM)
  const deployResult = await deploy(contractName, {
    from: deployer,
    contract: contractName,
    log: true,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: multisig,
      proxyContract: 'OptimizedTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          // call setVewom and setVoter later
          args: [wombatToken, ethers.constants.AddressZero, ethers.constants.AddressZero, 375],
        },
      },
    },
  })

  if (deployResult.newlyDeployed) {
    deployments.log(`${contractName} Contract deployed at ${deployResult.address}.`)
  } else {
    deployments.log(`${contractName} Contract already deployed.`)
  }
  logVerifyCommand(hre.network.name, deployResult)
  return deployResult
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['WombatToken']
