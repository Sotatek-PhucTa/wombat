import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { BRIBE_MAPS } from '../tokens.config'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, upgrades } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()

  console.log(`Step 131. Deploying on: ${hre.network.name}...`)

  // Deploy all Bribe
  const voterDeployment = await deployments.get('Voter')
  const voter = await ethers.getContractAt('Voter', voterDeployment.address)
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
deployFunc.dependencies = ['MasterWombatV3', 'Voter']
deployFunc.tags = ['Bribe']