import { BigNumber, BigNumberish, Contract } from 'ethers'
import { deployments, ethers } from 'hardhat'
import { getTestERC20 } from '../utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import { expect } from 'chai'

describe('[Rewarder]', function () {
  const axlUSDCDecimals = 6
  const USDCDecimals = 18
  const maxTokenPerSec = parseEther('10000')

  let owner: SignerWithAddress
  let user: SignerWithAddress
  let master: Contract
  let USDC: Contract
  let axlUSDC: Contract

  beforeEach(async function () {
    await deployments.fixture(['MockTokens'])
    ;[owner, user] = await ethers.getSigners()
    master = await ethers.deployContract('RewarderCaller')

    USDC = await getTestERC20('USDC')
    expect(await USDC.decimals()).to.eq(USDCDecimals)

    axlUSDC = await getTestERC20('axlUSDC')
    expect(await axlUSDC.decimals()).to.eq(axlUSDCDecimals)

    // Note: rewarder use master's LP balance as total share
    await topUp(master.address, parseUSDC('1'))
  })

  describe('axlUSDC (6 decimal)', function () {
    it('rewards 1 axlUSDC/s', async function () {
      const rewarder = await deployRewarder({
        rewardToken: axlUSDC.address,
        tokenPerSec: parseAxlUSDC('1'),
      })
      await master.onReward(rewarder.address, user.address, /*lpAmount=*/ parseEther('1'))
      await time.increase(3600) // T+1h
      const [rewards] = await rewarder.pendingTokens(user.address)
      expect(rewards).to.eql(parseAxlUSDC('3600'))
    })

    it('works with small shares', async function () {
      const rewarder = await deployRewarder({
        rewardToken: axlUSDC.address,
        tokenPerSec: parseAxlUSDC('1'),
      })
      await topUpTo(master.address, parseUSDC('1000000'))
      expect(await USDC.balanceOf(master.address)).to.eql(parseUSDC('1000000'))

      await master.onReward(rewarder.address, user.address, /*lpAmount=*/ parseEther('1'))
      const now = await time.latest()
      await time.increaseTo(now + 1) // T+1s
      {
        const [rewards] = await rewarder.pendingTokens(user.address)
        expect(rewards).to.eql(parseAxlUSDC('0.000001'))
      }

      await time.increaseTo(now + 3600) // T+1h
      {
        const [rewards] = await rewarder.pendingTokens(user.address)
        expect(rewards).to.eql(parseAxlUSDC('0.0036'))
      }

      await time.increaseTo(now + 7 * 24 * 3600) // T+7d
      {
        const [rewards] = await rewarder.pendingTokens(user.address)
        expect(rewards).to.eql(parseAxlUSDC('0.6048'))
      }
    })

    it('does not overflow at max reward rate for one month', async function () {
      const rewarder = await deployRewarder({
        rewardToken: axlUSDC.address,
        tokenPerSec: maxTokenPerSec,
      })
      await master.onReward(rewarder.address, user.address, /*lpAmount=*/ parseEther('1'))
      await time.increase(30 * 24 * 3600) // T+30d
      const [rewards] = await rewarder.pendingTokens(user.address)
      expect(rewards).to.eql(parseAxlUSDC('25920000000000000000000'))
      expect(rewards).to.eql(maxTokenPerSec.mul(30 * 24 * 3600))
    })
  })

  describe('USDC (18 decimal)', function () {
    it('rewards 1 USDC/s', async function () {
      const rewarder = await deployRewarder({
        rewardToken: USDC.address,
        tokenPerSec: parseUSDC('1'),
      })
      await master.onReward(rewarder.address, user.address, /*lpAmount=*/ parseEther('1'))
      await time.increase(3600) // T+1h
      const [rewards] = await rewarder.pendingTokens(user.address)
      expect(rewards).to.eql(parseUSDC('3600'))
    })

    it('does not overflow at max reward rate for one month', async function () {
      const rewarder = await deployRewarder({
        rewardToken: USDC.address,
        tokenPerSec: maxTokenPerSec,
      })
      await master.onReward(rewarder.address, user.address, /*lpAmount=*/ parseEther('1'))
      await time.increase(30 * 24 * 3600) // T+30d
      const [rewards] = await rewarder.pendingTokens(user.address)
      expect(rewards).to.eql(parseUSDC('25920000000'))
      expect(rewards).to.eql(maxTokenPerSec.mul(30 * 24 * 3600))
    })
  })

  interface RewardInfo {
    rewardToken: string
    tokenPerSec: BigNumberish
  }

  async function deployRewarder(rewardInfo: RewardInfo) {
    return ethers.deployContract('MultiRewarderPerSec', [
      /*master=*/ master.address,
      // lpToken must have 18 decimals!
      /*lpToken=*/ USDC.address,
      (await time.latest()) + 1,
      /*rewardToken=*/ rewardInfo.rewardToken,
      /*tokenPerSec=*/ rewardInfo.tokenPerSec, // must match rewardToken decimals!
    ])
  }

  async function topUp(address: string, amount: BigNumberish) {
    await USDC.faucet(amount)
    await USDC.transfer(address, amount)
  }

  async function topUpTo(address: string, target: BigNumberish) {
    const amount = BigNumber.from(target).sub(await USDC.balanceOf(address))
    await topUp(address, amount)
  }

  function parseUSDC(value: string) {
    return parseUnits(value, USDCDecimals)
  }

  function parseAxlUSDC(value: string) {
    return parseUnits(value, axlUSDCDecimals)
  }
})
