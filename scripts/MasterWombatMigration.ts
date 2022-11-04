import * as hre from 'hardhat'
import { ethers } from 'hardhat'
import { BigNumber, Contract } from 'ethers'
import { getDeployedContract } from '../utils'
import _ from 'lodash'

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
  const v2Infos = _.keyBy(await readV2Info(masterWombatV2), 'lpToken')
  const v3Infos = _.keyBy(await readV3Info(masterWombatV3), 'lpToken')

  console.log('Comparing LPs between MasterWombatV2 and MasterWombatV3')
  diffLPs(v2Infos, v3Infos)
  console.log('Comparing rewarders between MasterWombatV2 and MasterWombatV3')
  diffRewarders(v2Infos, v3Infos)

  const voterInfos = _.keyBy(await readVoterInfo(voter), 'lpToken')
  console.log('Comparing LPs between MasterWombatV2 and Voter')
  diffLPs(v2Infos, voterInfos)
  console.log('Comparing allocPoints between MasterWombatV2 and Voter')
  diffAllocPoints(v2Infos, voterInfos)
}

function diffLPs(expected: any, actual: any) {
  for (const lp in expected) {
    if (!actual[lp]) {
      console.warn('-', lp)
    }
  }
  for (const lp in actual) {
    if (!expected[lp]) {
      console.warn('+', lp)
    }
  }
}

function diffRewarders(expected: any, actual: any) {
  for (const lp in expected) {
    if (!actual[lp]) {
      continue
    }

    const expectedRewarder = expected[lp].rewarder != ethers.constants.AddressZero
    const actualRewarder = actual[lp].rewarder != ethers.constants.AddressZero
    if (expectedRewarder != actualRewarder) {
      console.warn(lp, 'expected', expectedRewarder, 'rewarder but found', actualRewarder, 'rewarder')
    }
  }
}

function diffAllocPoints(expected: any, actual: any) {
  for (const lp in expected) {
    if (!actual[lp]) {
      continue
    }
    const expectedAllocPoint = expected[lp].allocPoint.toNumber()
    const actualAllocPoint = actual[lp].allocPoint.toNumber()
    if (expectedAllocPoint != actualAllocPoint) {
      console.warn(lp, 'expected', expectedAllocPoint, 'alloc point but found', actualAllocPoint)
    }
  }
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
