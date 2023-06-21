import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { logVerifyCommand } from '../utils'
import { parseEther } from 'ethers/lib/utils'
import { Token, getTokenAddress } from '../config/token'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()

  deployments.log(`Step 130. Deploying on: ${hre.network.name}...`)

  const wombatToken = await getTokenAddress(Token.WOM)
  const vewom = await deployments.get('VeWom')

  const block = await ethers.provider.getBlock('latest')
  const latest = BigNumber.from(block.timestamp)
  const epochStart = latest.add(300) // T+5min
  // const epochStart = 1680069300 // Thu, 29 Mar 2023 05:55:00 GMT

  // Deploy Voter
  const womPerSec = parseEther('1800000').div(30 * 24 * 3600) // 1.8M WOM/month
  const baseAllocation = 750 // 25% left for vote allocation
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
          args: [wombatToken, vewom.address, womPerSec, latest, epochStart, baseAllocation],
        },
      },
    },
  })

  const implAddr = await upgrades.erc1967.getImplementationAddress(deployResult.address)
  deployments.log('Contract address:', deployResult.address)
  deployments.log('Implementation address:', implAddr)

  if (deployResult.newlyDeployed) {
    deployments.log(`Voter Deployment complete.`)
  }

  logVerifyCommand(deployResult)
}

export default deployFunc
deployFunc.dependencies = ['WombatToken', 'VeWom']
deployFunc.tags = ['Voter']
