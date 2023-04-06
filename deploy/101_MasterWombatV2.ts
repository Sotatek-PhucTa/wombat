import { ethers } from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getAddress, logVerifyCommand } from '../utils'
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { WOMBAT_TOKEN } from '../config/tokens.config'
import { Network } from '../types'

const contractName = 'MasterWombatV2'

const deployFunc = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()

  deployments.log(`Step 101. Deploying on : ${hre.network.name} with account : ${deployer}`)
  const wombatToken = await getAddress(WOMBAT_TOKEN[hre.network.name as Network])
  const womPerSec = 1 // small amount > 0 to avoid actually sending emission
  const latest = await time.latest()
  const startTimestamp = latest + 300 // T+5min
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
          args: [wombatToken, ethers.constants.AddressZero, womPerSec, 375, startTimestamp],
        },
      },
    },
  })

  // Get freshly deployed MasterWombat contract
  const implAddr = await upgrades.erc1967.getImplementationAddress(deployResult.address)
  deployments.log('Contract address:', deployResult.address)
  deployments.log('Implementation address:', implAddr)

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
// always skip since we migrated to MasterWombatV3
deployFunc.skip = async () => true
