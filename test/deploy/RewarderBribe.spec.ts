import { deployments, ethers } from 'hardhat'
import { getDeployedContract, getTestERC20 } from '../../utils'
import { expect } from 'chai'
import { BigNumberish, Contract } from 'ethers'
import _ from 'lodash'
import { parseEther } from 'ethers/lib/utils'
import { restoreOrCreateSnapshot } from '../fixtures/executions'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

describe('RewarderBribe', function () {
  let owner: SignerWithAddress
  let wom: Contract
  let usdt: Contract
  let busd: Contract

  beforeEach(
    restoreOrCreateSnapshot(async function () {
      await deployments.fixture(['HighCovRatioFeePoolAssets', 'Bribe', 'MultiRewarderPerSec', 'Voter'])
      ;[owner] = await ethers.getSigners()
      ;[wom, usdt, busd] = await Promise.all([getTestERC20('WombatToken'), getTestERC20('USDT'), getTestERC20('BUSD')])
    })
  )

  it('deploys rewarder for LP-BUSD', async function () {
    const rewarder = await getRewarder('MultiRewarderPerSec_V3_Asset_MainPool_BUSD')
    expect(await rewarder.operator()).to.eq(busd.address)
    const rewardInfos = await getRewardInfos(rewarder)
    expect(rewardInfos).to.eql([
      {
        rewardToken: wom.address,
        tokenPerSec: parseEther('100'),
      },
    ])
  })

  it('deploys rewarder for LP-USDT', async function () {
    const rewarder = await getRewarder('MultiRewarderPerSec_V3_Asset_MainPool_USDT')
    expect(await rewarder.operator()).to.eq(owner.address)
    const rewardInfos = await getRewardInfos(rewarder)
    expect(rewardInfos).to.eql([
      {
        rewardToken: usdt.address,
        tokenPerSec: parseEther('12.3'),
      },
      {
        rewardToken: wom.address,
        tokenPerSec: parseEther('100'),
      },
    ])
  })

  it('deploys bribe for LP-BUSD', async function () {
    const rewarder = await getRewarder('Bribe_Asset_MainPool_BUSD')
    expect(await rewarder.operator()).to.eq(busd.address)
    const rewardInfos = await getRewardInfos(rewarder)
    expect(rewardInfos).to.eql([
      {
        rewardToken: wom.address,
        tokenPerSec: parseEther('100'),
      },
    ])
  })

  it('deploys rewarder for LP-USDT', async function () {
    const rewarder = await getRewarder('Bribe_Asset_MainPool_USDT')
    expect(await rewarder.operator()).to.eq(owner.address)
    const rewardInfos = await getRewardInfos(rewarder)
    expect(rewardInfos).to.eql([
      {
        rewardToken: usdt.address,
        tokenPerSec: parseEther('12.3'),
      },
      {
        rewardToken: busd.address,
        tokenPerSec: parseEther('3.45'),
      },
      {
        rewardToken: wom.address,
        tokenPerSec: parseEther('100'),
      },
    ])
  })

  interface RewardInfo {
    rewardToken: string
    tokenPerSec: BigNumberish
  }

  async function getRewarder(deployment: string): Promise<Contract> {
    return getDeployedContract('MultiRewarderPerSec', deployment)
  }

  async function getRewardInfos(rewarder: Contract): Promise<RewardInfo[]> {
    const length = await rewarder.rewardLength()
    return Promise.all(
      _.range(0, length).map(async (i) => {
        const { rewardToken, tokenPerSec } = await rewarder.rewardInfo(i)
        return {
          rewardToken,
          tokenPerSec,
        }
      })
    )
  }
})
