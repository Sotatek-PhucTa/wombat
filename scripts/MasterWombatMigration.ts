import * as hre from 'hardhat'
import { ethers } from 'hardhat'
import { BigNumber, Contract } from 'ethers'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getDeployedContract, confirmTxn } from '../utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

/**
 * This is a script aids migration of MasterWombatV2 to MasterWombatV3 (and Voter).
 * Here are the invariants we check:
 * 1. any LP in MWv2 is also in MWv3 and Voter
 * 2. rewarder in MWv2 has a counterpart in MWv3
 * 3. allocPoint are same for MWv2 and Voter
 * 4. Voter's gaugeManager all point to MWv3
 */
async function main() {
  console.log('Migrating MasterWombat on', hre.network.name)
  const masterWombatV2 = await getDeployedContract('MasterWombatV2')
  const masterWombatV3 = await getDeployedContract('MasterWombatV3')
  const voter = await getDeployedContract('Voter')

  // Step 1. read all Info from MasterWombatV2
  const v2Infos = await readV2Info(masterWombatV2)
  console.log('Read', v2Infos.length, 'poolInfos from MasterWombatV2')
  console.debug('v2Infos', v2Infos)

  // Step 2. read all Info from MasterWombatV3
  const v3Infos = await readV3Info(masterWombatV3)
  console.log('Read', v3Infos.length, 'poolInfos from MasterWombatV3')
  console.debug('v3Infos', v3Infos)

  // Step 3. read all lpTokens from Voter
  const voterInfos = await readVoterInfo(voter)
  console.log('Read', voterInfos.length, 'voterInfos from Voter')
  console.debug('voterInfos', voterInfos)
}

async function readV2Info(masterWombatV2: Contract): Promise<MasterWombatV2Info[]> {
  const poolLength = await masterWombatV2.poolLength()
  const poolInfos = []
  for (let i = 0; i < poolLength; i++) {
    poolInfos.push(masterWombatV2.poolInfo(i))
  }
  return Promise.all(poolInfos)
}

async function readV3Info(masterWombatV3: Contract): Promise<MasterWombatV3Info[]> {
  const poolLength = await masterWombatV3.poolLength()
  const poolInfos = []
  for (let i = 0; i < poolLength; i++) {
    poolInfos.push(masterWombatV3.poolInfo(i))
  }
  return Promise.all(poolInfos)
}

async function readVoterInfo(voter: Contract): Promise<VoterInfo[]> {
  const length = await voter.lpTokenLength()
  const tokens = []
  for (let i = 0; i < length; i++) {
    tokens.push(await voter.lpTokens(i))
  }

  const infos = []
  for (const lp of tokens) {
    const weight = await voter.weights(lp)
    const gauge = await voter.infos(lp)
    infos.push({
      lpToken: lp,
      allocPoint: weight.allocPoint,
      gaugeManager: gauge.gaugeManager,
      bribe: gauge.bribe,
    })
  }

  return infos
}

interface MasterWombatV2Info {
  lpToken: string
  allocPoint: BigNumber
  rewarder: string
}

interface MasterWombatV3Info {
  lpToken: string
  rewarder: string // Non-zero if MasterWombatV2 is
}

interface VoterInfo {
  lpToken: string
  allocPoint: BigNumber // should be same as MasterWombatV2's
  gaugeManager: string // should be MasterWombatV3
  bribe: string // AddressZero if no bribe
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
