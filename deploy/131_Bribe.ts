import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber, Contract } from 'ethers'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { BRIBE_MAPS } from '../tokens.config'
import { confirmTxn, getDeployedContract, isOwner, logVerifyCommand } from '../utils'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const [owner] = await ethers.getSigners() // first account used for testnet and mainnet

  console.log(`Step 131. Deploying on: ${hre.network.name}...`)

  // Deploy all Bribe
  const voter = await getDeployedContract('Voter')
  const masterWombat = await deployments.get('MasterWombatV3')
  for await (const [token, bribe] of Object.entries(BRIBE_MAPS[hre.network.name])) {
    const deadline = getDeadlineFromNow(bribe.secondsToStart)
    const deployResult = await deploy(`Bribe_${token}`, {
      from: deployer,
      contract: 'Bribe',
      log: true,
      skipIfAlreadyDeployed: true,
      args: [voter.address, bribe.lpToken, deadline, bribe.rewardToken, bribe.tokenPerSec],
    })

    // Add new Bribe to Voter
    if (deployResult.newlyDeployed) {
      console.log(`Bribe_${token} Deployment complete.`)
      await addBribe(voter, owner, masterWombat.address, bribe.lpToken, deployResult.address)
      console.log(`Voter added Bribe_${token}.`)
    }

    logVerifyCommand(hre.network.name, deployResult)
  }
}

// Add a bribe to an LP or set if it already exists.
async function addBribe(
  voter: Contract,
  owner: SignerWithAddress,
  masterWombat: string,
  lpToken: string,
  bribe: string
) {
  console.log('addBribe', bribe)
  try {
    await confirmTxn(voter.connect(owner).add(masterWombat, lpToken, bribe))
  } catch (err: any) {
    if (err.error.stack.includes('voter: already added')) {
      console.log(`Set bribe ${bribe} since it is already added`)
      await confirmTxn(voter.connect(owner).setBribe(lpToken, bribe))
    } else {
      console.log('Failed to add bribe', bribe, 'due to', err)
      throw err
    }
  }
}

function getDeadlineFromNow(secondSince: string | number): number {
  return Math.round(Date.now() / 1000) + Number(secondSince)
}

export default deployFunc
deployFunc.dependencies = ['MasterWombatV3', 'Voter']
deployFunc.tags = ['Bribe']
