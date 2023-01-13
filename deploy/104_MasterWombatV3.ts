import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { logVerifyCommand } from '../utils'

const contractName = 'MasterWombatV3'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()

  console.log(`Step 104. Deploying on : ${hre.network.name} with account : ${deployer}`)

  const wombatToken = await deployments.get('WombatToken')
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
          args: [wombatToken.address, ethers.constants.AddressZero, ethers.constants.AddressZero, 375],
        },
      },
    },
  })

  if (deployResult.newlyDeployed) {
    console.log(`${contractName} Contract deployed at ${deployResult.address}.`)
  } else {
    console.log(`${contractName} Contract already deployed.`)
  }
  logVerifyCommand(hre.network.name, deployResult)
  return deployResult
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.dependencies = ['WombatToken']
