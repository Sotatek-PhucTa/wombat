import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { BRIBE_MAPS } from '../tokens.config'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()

  console.log(`Step 130. Deploying on: ${hre.network.name}...`)

  const wombatToken = await deployments.get('WombatToken')
  const vewom = await deployments.get('VeWom')

  const block = await ethers.provider.getBlock('latest')
  const latest = BigNumber.from(block.timestamp)

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
          args: [wombatToken.address, vewom.address, ethers.constants.Zero, latest, latest, 375],
        },
      },
    },
  })

  const voter = await ethers.getContractAt('Voter', deployResult.address)
  const implAddr = await upgrades.erc1967.getImplementationAddress(deployResult.address)
  console.log('Contract address:', deployResult.address)
  console.log('Implementation address:', implAddr)

  if (deployResult.newlyDeployed) {
    console.log(`Voter Deployment complete.`)
  }

  const address = deployResult.address
  console.log(
    `To verify, run: hardhat verify --network ${hre.network.name} ${wombatToken.address} ${vewom.address} ${
      ethers.constants.Zero
    } ${latest} ${latest} ${375}`
  )

  // Deploy all Bribe
  const masterWombat = await deployments.get('MasterWombatV3')
  for await (const [token, bribe] of Object.entries(BRIBE_MAPS[hre.network.name])) {
    const deadline = getDeadlineFromNow(bribe.secondsToStart)
    const deployResult = await deploy(`Bribe_${token}`, {
      from: deployer,
      contract: 'Bribe',
      log: true,
      skipIfAlreadyDeployed: true,
      args: [masterWombat.address, bribe.lpToken, deadline, bribe.rewardToken, bribe.tokenPerSec],
    })

    // Add new Bribe to Voter
    if (deployResult.newlyDeployed) {
      console.log(`Bribe_${token} Deployment complete.`)

      const txn = await voter.add(masterWombat.address, bribe.lpToken, deployResult.address)
      await txn.wait()
      console.log(`Voter added Bribe_${token}.`)
    }

    const address = deployResult.address
    console.log(
      `To verify, run: hardhat verify --network ${hre.network.name} ${address} ${masterWombat.address} ${
        bribe.lpToken
      } ${BigNumber.from(deadline)._hex} ${bribe.rewardToken} ${bribe.tokenPerSec._hex}`
    )
  }
}

function getDeadlineFromNow(secondSince: string | number): number {
  return Math.round(Date.now() / 1000) + Number(secondSince)
}

export default deployFunc
deployFunc.dependencies = ['WombatToken', 'VeWom', 'MasterWombatV3']
deployFunc.tags = ['Voter']
