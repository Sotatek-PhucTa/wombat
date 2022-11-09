import { deployments, ethers, network } from 'hardhat'
import { BigNumber, Contract } from 'ethers'
import { getDeployedContract } from '../../utils'
import _ from 'lodash'
import { expect } from 'chai'

/**
 * This script performs sanity check on MasterWombatV3 and Voter against
 * MasterWombatV2. Example command:
 *   npx hh test --network bsc_testnet scripts/sanity_check/MasterWombatMigration.ts
 */
describe('MasterWombatMigration', function () {
  let masterWombatV2: Contract
  let masterWombatV3: Contract
  let voter: Contract
  let vewom: Contract
  let v2Infos: _.Dictionary<MasterWombatV2Info>
  let v3Infos: _.Dictionary<MasterWombatV3Info>
  let voterInfos: _.Dictionary<VoterInfo>

  before(function () {
    console.log('Running sanity checks on MasterWombat on', network.name)
  })

  beforeEach(async function () {
    await deployments.all()

    masterWombatV2 = await getDeployedContract('MasterWombatV2')
    masterWombatV3 = await getDeployedContract('MasterWombatV3')
    voter = await getDeployedContract('Voter')
    vewom = await getDeployedContract('VeWom')

    v2Infos = _.keyBy(await readV2Info(masterWombatV2), 'lpToken')
    v3Infos = _.keyBy(await readV3Info(masterWombatV3), 'lpToken')
    voterInfos = _.keyBy(await readVoterInfo(voter), 'lpToken')
  })

  it('Check LPs are the same between MasterWombatV2 and MasterWombatV3', async function () {
    expect(v2Infos).to.have.all.keys(v3Infos)
  })

  it('Check LPs are the same between MasterWombatV2 and Voter', async function () {
    expect(v2Infos).to.have.all.keys(voterInfos)
  })

  it('Check GaugeManager in Voter is the same as MasterWombatV3', async function () {
    for (const lp in voterInfos) {
      expect(voterInfos[lp].gaugeManager).to.eql(masterWombatV3.address)
    }
  })

  // Note: this fails at the first difference.
  it('Check allocPoints are the same between Voter and MasterWombatV2', async function () {
    for (const lp in v2Infos) {
      // Skip if LP does not exist in Voter
      if (!voterInfos[lp]) {
        continue
      }
      const asset = await ethers.getContractAt('Asset', lp)
      const v2AllocPoint = v2Infos[lp].allocPoint.toNumber()
      const voterAllocPoint = voterInfos[lp].allocPoint.toNumber()
      expect(v2AllocPoint).to.eql(voterAllocPoint, `${await asset.name()}`)
    }
  })

  it('Check voter is set correctly', async function () {
    expect(await masterWombatV3.voter()).to.eql(voter.address)
    expect(await vewom.voter()).to.eql(voter.address)
  })

  // Note: this fails at the first difference.
  it('Check rewarders are present in both MasterWombatV2 and MasterWombatV3', async function () {
    for (const lp in v2Infos) {
      // Skip if LP does not exist in MWv3
      if (!v3Infos[lp]) {
        continue
      }

      const hasV2Rewarder = v2Infos[lp].rewarder != ethers.constants.AddressZero
      const hasV3Rewarder = v3Infos[lp].rewarder != ethers.constants.AddressZero
      expect(hasV2Rewarder).to.eql(hasV3Rewarder)
    }
  })

  it('Check MasterWombatV2 rewarders has 0 reward rate', async function () {
    await Promise.all(
      Object.keys(v2Infos)
        .filter((lp) => v2Infos[lp].rewarder != ethers.constants.AddressZero)
        .map(async (lp) => {
          const rewarder = await ethers.getContractAt('MultiRewarderPerSec', v2Infos[lp].rewarder)
          return Promise.all(
            _.range(0, await rewarder.rewardLength()).map(async (i) => {
              const rewardInfo = await rewarder.rewardInfo(i)
              expect(rewardInfo.tokenPerSec.isZero(), `lp ${lp}'s ${i}-th rewarder should have no reward rate`).to.be
                .true
            })
          )
        })
    )
  })
  // TODO: new rewarders in MWv3 has reward rate > 0
  // TODO: MWv2 has setNewMasterWombat to MWv3
  // TODO: MWv2 has emission rate 0
  // TODO: all Pool has setMasterWombat to MWv3
})

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
