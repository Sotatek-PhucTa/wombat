import { deployments } from 'hardhat'
import { getDeployedContract, getTestERC20 } from '../../utils'
import { expect } from 'chai'
import { BigNumberish, Contract } from 'ethers'
import _ from 'lodash'
import { parseEther } from 'ethers/lib/utils'

describe.skip('RewarderBribe', function () {
  let wom: Contract
  let usdt: Contract
  let busd: Contract

  beforeEach(async function () {
    await deployments.fixture(['Asset', 'Bribe', 'MultiRewarderPerSec', 'Voter'])
    ;[wom, usdt, busd] = await Promise.all([getTestERC20('WombatToken'), getTestERC20('USDT'), getTestERC20('BUSD')])
  })

  it('deploys rewarder for LP-BUSD', async function () {
    const rewardInfos = await getRewardInfos('MultiRewarderPerSec_V3_Asset_P01_BUSD')
    expect(rewardInfos).to.eql([
      {
        rewardToken: wom.address,
        tokenPerSec: parseEther('100'),
      },
    ])
  })

  it('deploys rewarder for LP-USDT', async function () {
    const rewardInfos = await getRewardInfos('MultiRewarderPerSec_V3_Asset_P01_USDT')
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
    const rewardInfos = await getRewardInfos('Bribe_Asset_P01_BUSD')
    expect(rewardInfos).to.eql([
      {
        rewardToken: wom.address,
        tokenPerSec: parseEther('100'),
      },
    ])
  })

  it('deploys rewarder for LP-USDT', async function () {
    const rewardInfos = await getRewardInfos('Bribe_Asset_P01_USDT')
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

  async function getRewardInfos(deployment: string): Promise<RewardInfo[]> {
    const rewarder = await getDeployedContract('MultiRewarderPerSec', deployment)
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