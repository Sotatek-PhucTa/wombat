import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { logVerifyCommand } from '../utils'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()

  console.log(`Step 130. Deploying on: ${hre.network.name}...`)

  const wombatToken = await deployments.get('WombatToken')
  const vewom = await deployments.get('VeWom')

  const block = await ethers.provider.getBlock('latest')
  const latest = BigNumber.from(block.timestamp)
  const epochStart = latest.add(300) // T+5min

  // Deploy Voter
  const deployResult = await deploy('Voter', {
    from: deployer,
    contract: 'Voter',
    log: true,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: multisig,
      proxyContract: 'OptimizedTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [wombatToken.address, vewom.address, ethers.constants.Zero, latest, epochStart, 375],
        },
      },
    },
  })

  const implAddr = await upgrades.erc1967.getImplementationAddress(deployResult.address)
  console.log('Contract address:', deployResult.address)
  console.log('Implementation address:', implAddr)

  if (deployResult.newlyDeployed) {
    console.log(`Voter Deployment complete.`)
  }

  logVerifyCommand(hre.network.name, deployResult)
}

export default deployFunc
deployFunc.dependencies = ['WombatToken', 'VeWom']
deployFunc.tags = ['Voter']
