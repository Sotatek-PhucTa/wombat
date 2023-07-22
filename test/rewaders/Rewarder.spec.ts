import { BigNumber, BigNumberish, Contract } from 'ethers'
import { deployments, ethers } from 'hardhat'
import { getTestERC20 } from '../../utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import { assert, expect } from 'chai'

describe('[Rewarder]', function () {
  const USDCDecimals = 18
  const DAIDecimals = 18
  const axlUSDCDecimals = 6
  const maxTokenPerSec = parseEther('10000')

  let owner: SignerWithAddress
  let user: SignerWithAddress
  let master: Contract
  let USDC: Contract
  let DAI: Contract
  let axlUSDC: Contract

  beforeEach(async function () {
    await deployments.fixture(['MockTokens'])
    ;[owner, user] = await ethers.getSigners()
    master = await ethers.deployContract('RewarderCaller')

    USDC = await getTestERC20('USDC')
    expect(await USDC.decimals()).to.eq(USDCDecimals)

    DAI = await getTestERC20('DAI')
    expect(await DAI.decimals()).to.eq(DAIDecimals)

    axlUSDC = await getTestERC20('axlUSDC')
    expect(await axlUSDC.decimals()).to.eq(axlUSDCDecimals)

    await Promise.all(
      [USDC, DAI, axlUSDC].map(async (token) => {
        token.approve(master.address, ethers.constants.MaxUint256)
      })
    )
  })

  describe('axlUSDC (6 decimal)', function () {
    it('rewards 1 axlUSDC/s', async function () {
      const rewarder = await deployRewarder({
        rewardToken: axlUSDC.address,
        tokenPerSec: parseAxlUSDC('1'),
      })
      await deposit(user, master, rewarder, parseEther('1'))
      await time.increase(3600) // T+1h
      const [rewards] = await rewarder.pendingTokens(user.address)
      expect(rewards).to.be.closeTo(parseAxlUSDC('3600'), parseAxlUSDC('3'))
    })

    it('works with small shares', async function () {
      const rewarder = await deployRewarder({
        rewardToken: axlUSDC.address,
        tokenPerSec: parseAxlUSDC('1'),
      })
      await deposit(owner, master, rewarder, parseEther('1000000'))
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
      await deposit(user, master, rewarder, parseEther('1'))
      await time.increase(30 * 24 * 3600) // T+30d
      const [rewards] = await rewarder.pendingTokens(user.address)
      expect(rewards).to.be.closeTo(maxTokenPerSec.mul(30 * 24 * 3600), maxTokenPerSec.mul(3))
    })
  })

  describe('USDC (18 decimal)', function () {
    it('rewards 1 USDC/s', async function () {
      const rewarder = await deployRewarder({
        rewardToken: USDC.address,
        tokenPerSec: parseUSDC('1'),
      })
      await deposit(user, master, rewarder, parseEther('1'))
      await time.increase(3600) // T+1h
      const [rewards] = await rewarder.pendingTokens(user.address)
      expect(rewards).to.be.closeTo(parseUSDC('3600'), parseUSDC('3'))
    })

    it('does not overflow at max reward rate for one month', async function () {
      const rewarder = await deployRewarder({
        rewardToken: USDC.address,
        tokenPerSec: maxTokenPerSec,
      })
      await deposit(user, master, rewarder, parseEther('1'))
      await time.increase(30 * 24 * 3600) // T+30d
      const [rewards] = await rewarder.pendingTokens(user.address)
      expect(rewards).to.be.closeTo(maxTokenPerSec.mul(30 * 24 * 3600), maxTokenPerSec.mul(3))
    })
  })

  describe('Emission', function () {
    let rewarder: Contract

    beforeEach(async function () {
      rewarder = await deployRewarder({
        rewardToken: DAI.address,
        tokenPerSec: parseDAI('0'),
        lpToken: DAI.address,
      })
    })

    it('UpdateReward does not crash when there are no shares', async function () {
      // This could crash if there is a division by zero.
      expect(await getTotalShares(rewarder)).to.eq(0)
      expect(await rewarder.updateReward()).to.be.ok
    })

    it('A user cannot steal all bribes', async function () {
      // A rewarder is deployed for next bribe a long time ago
      // A user deposits and withdraw some LP token when there are no rewards
      await deposit(user, master, rewarder, parseDAI('1'))
      await withdraw(user, master, rewarder, parseDAI('1'))
      expect(await getTotalShares(rewarder)).to.eq(0)
      const lastRewardTimestamp = await rewarder.lastRewardTimestamp()

      // Two weeks later, we activate the rewarder at 1 DAI/s
      await time.increase(14 * 24 * 3600) // T+14d
      await rewarder.setRewardRate(0, parseDAI('1'))
      // Timestamp is updated. If not, a user can steal all the bribe.
      expect(await rewarder.lastRewardTimestamp()).to.eq(lastRewardTimestamp.add(14 * 24 * 3600 + 1))

      // The user deposits again after the reward is live.
      // There are no pending rewards from stale lastRewardTimestamp.
      await deposit(user, master, rewarder, parseDAI('1'))
      const [rewards] = await rewarder.pendingTokens(user.address)
      expect(rewards).to.be.eq(0)
    })
  })

  interface RewardInfo {
    rewardToken: string
    tokenPerSec: BigNumberish
    lpToken?: string
  }

  async function deployRewarder(rewardInfo: RewardInfo) {
    return ethers.deployContract('MultiRewarderPerSec', [
      /*master=*/ master.address,
      // lpToken must have 18 decimals!
      /*lpToken=*/ rewardInfo.lpToken ?? USDC.address,
      /*startTimestamp=*/ (await time.latest()) + 1, // starts immediately
      /*rewardToken=*/ rewardInfo.rewardToken,
      /*tokenPerSec=*/ rewardInfo.tokenPerSec, // must match rewardToken decimals!
    ])
  }

  // Simulate a deposit by increase LP balance in master and calls onReward.
  async function deposit(user: SignerWithAddress, master: Contract, rewarder: Contract, amount: BigNumberish) {
    const erc20 = await getLPTokenAsTestERC20(rewarder)
    await topUp(owner.address, amount, erc20)
    return master.depositFor(rewarder.address, user.address, amount)
  }

  // Simulate a withdraw by decreasing LP balance in master and calls onReward.
  async function withdraw(user: SignerWithAddress, master: Contract, rewarder: Contract, amount: BigNumberish) {
    return master.withdrawFor(rewarder.address, user.address, amount)
  }

  async function topUp(address: string, amount: BigNumberish, erc20: Contract = USDC) {
    await erc20.faucet(amount)
    return erc20.transfer(address, amount)
  }

  async function topUpTo(address: string, target: BigNumberish, erc20: Contract = USDC) {
    const amount = BigNumber.from(target).sub(await erc20.balanceOf(address))
    assert(amount.gt(0), 'Cannot topUp negative amount')
    return topUp(address, amount)
  }

  // Rewarder use master's LP balance as total share.
  async function getTotalShares(rewarder: Contract) {
    const erc20 = await getLPTokenAsTestERC20(rewarder)
    const master = await rewarder.master()
    return erc20.balanceOf(master)
  }

  async function getLPTokenAsTestERC20(rewarder: Contract) {
    const lpToken = await rewarder.lpToken()
    return ethers.getContractAt('TestERC20', lpToken)
  }

  function parseUSDC(value: string) {
    return parseUnits(value, USDCDecimals)
  }

  function parseDAI(value: string) {
    return parseUnits(value, DAIDecimals)
  }

  function parseAxlUSDC(value: string) {
    return parseUnits(value, axlUSDCDecimals)
  }
})
