import { time } from '@nomicfoundation/hardhat-network-helpers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { BigNumberish, Contract, constants } from 'ethers'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import { deployments, ethers } from 'hardhat'
import { BoostedMultiRewarder, BoostedMasterWombat, TestERC20, VeWom, Voter, WombatERC20 } from '../../build/typechain'
import { getDeployedContract, getTestERC20 } from '../../utils'
import { AddressZero } from '@ethersproject/constants'

describe('BoostedMultiRewarder', function () {
  const USDCDecimals = 18
  const DAIDecimals = 18
  const axlUSDCDecimals = 6
  const maxTokenPerSec = parseEther('10000')

  let owner: SignerWithAddress
  let user1: SignerWithAddress
  let user2: SignerWithAddress
  let master: BoostedMasterWombat
  let USDC: TestERC20
  let DAI: TestERC20
  let axlUSDC: TestERC20
  let wom: WombatERC20
  let veWom: VeWom
  let voter: Voter

  beforeEach(async function () {
    await deployments.fixture(['MockTokens', 'MasterWombatV3', 'Voter', 'VeWom'])
    ;[owner, user1, user2] = await ethers.getSigners()
    master = (await ethers.deployContract('BoostedMasterWombat')) as BoostedMasterWombat

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

    voter = (await getDeployedContract('Voter')) as Voter
    wom = (await ethers.deployContract('WombatERC20', [owner.address, parseEther('1000000000')])) as WombatERC20
    veWom = (await getDeployedContract('VeWom')) as VeWom

    await master.initialize(wom.address, veWom.address, voter.address, 1000)
  })

  describe('axlUSDC (6 decimal)', function () {
    it('rewards 1 axlUSDC/s', async function () {
      const rewarder = await deployRewarder({
        rewardToken: axlUSDC.address,
        tokenPerSec: parseAxlUSDC('1'),
        lpToken: USDC.address,
      })
      await deposit(user1, master, rewarder, parseEther('1'))
      await topUp(rewarder.address, parseAxlUSDC('5000'), axlUSDC) // should be enough balance
      await time.increase(3600) // T+1h
      const { pendingBonusRewards } = await master.pendingTokens(0, user1.address)
      const rewards = pendingBonusRewards[0]
      expect(rewards).to.be.closeTo(parseAxlUSDC('3600'), parseAxlUSDC('3'))
    })

    it('works with small shares', async function () {
      const rewarder = await deployRewarder({
        rewardToken: axlUSDC.address,
        tokenPerSec: parseAxlUSDC('1'),
        lpToken: USDC.address,
      })
      await deposit(owner, master, rewarder, parseEther('1000000'))
      await topUp(rewarder.address, parseAxlUSDC('604900'), axlUSDC) // enough for 7 days worth of reward

      await deposit(user1, master, rewarder, parseEther('1'))
      const now = await time.latest()
      await time.increaseTo(now + 2) // T+1s
      {
        const { pendingBonusRewards } = await master.pendingTokens(0, user1.address)
        const rewards = pendingBonusRewards[0]
        expect(rewards).to.eql(parseAxlUSDC('0.000001'))
      }

      await time.increaseTo(now + 3601) // T+1h
      {
        const { pendingBonusRewards } = await master.pendingTokens(0, user1.address)
        const rewards = pendingBonusRewards[0]
        expect(rewards).to.eql(parseAxlUSDC('0.0036'))
      }

      await time.increaseTo(now + 7 * 24 * 3600 + 1) // T+7d
      {
        const { pendingBonusRewards } = await master.pendingTokens(0, user1.address)
        const rewards = pendingBonusRewards[0]
        expect(rewards).to.eql(parseAxlUSDC('0.6048'))
      }
    })

    it('does not overflow at max reward rate for one month', async function () {
      const rewarder = await deployRewarder({
        rewardToken: axlUSDC.address,
        tokenPerSec: maxTokenPerSec,
        lpToken: USDC.address,
      })
      await deposit(user1, master, rewarder, parseEther('1'))
      await topUp(rewarder.address, maxTokenPerSec.mul(30 * 24 * 3600), axlUSDC) // top up 30 days worth of reward
      await time.increase(30 * 24 * 3600) // T+30d
      const { pendingBonusRewards } = await master.pendingTokens(0, user1.address)
      const rewards = pendingBonusRewards[0]
      expect(rewards).to.be.closeTo(maxTokenPerSec.mul(30 * 24 * 3600), maxTokenPerSec.mul(3))
    })
  })

  describe('USDC (18 decimal)', function () {
    it('rewards 1 USDC/s', async function () {
      const rewarder = await deployRewarder({
        rewardToken: USDC.address,
        tokenPerSec: parseUSDC('1'),
        lpToken: USDC.address,
      })
      await deposit(user1, master, rewarder, parseEther('1'))
      await topUp(rewarder.address, parseUSDC('3600'), USDC) // top up 1hr's worth of reward
      await time.increase(3600) // T+1h
      const { pendingBonusRewards } = await master.pendingTokens(0, user1.address)
      const rewards = pendingBonusRewards[0]
      // pendingTokens() shows 3600 USDC
      expect(rewards).to.be.closeTo(parseUSDC('3600'), parseUSDC('3'))
      // emit exactly the same amount
      await master.connect(user1).multiClaim([0])
      expect(await USDC.balanceOf(user1.address)).to.be.closeTo(rewards, parseUSDC('10'))
    })

    it('does not overflow at max reward rate for one month', async function () {
      const rewarder = await deployRewarder({
        rewardToken: USDC.address,
        tokenPerSec: maxTokenPerSec,
        lpToken: USDC.address,
      })
      await deposit(user1, master, rewarder, parseEther('1'))
      await topUp(rewarder.address, maxTokenPerSec.mul(30 * 24 * 3600), USDC) // top up 30 days' worth of reward
      await time.increase(30 * 24 * 3600) // T+30d
      const { pendingBonusRewards } = await master.pendingTokens(0, user1.address)
      const rewards = pendingBonusRewards[0]
      expect(rewards).to.be.closeTo(maxTokenPerSec.mul(30 * 24 * 3600), maxTokenPerSec.mul(3))
      await expect(() => master.connect(user1).multiClaim([0])).to.changeTokenBalances(USDC, [user1.address], [rewards])
    })

    it('stops emission when balance runs out. single user case', async function () {
      const rewarder = await deployRewarder({
        rewardToken: USDC.address,
        tokenPerSec: parseUSDC('1'),
        lpToken: USDC.address,
      })
      await deposit(user1, master, rewarder, parseEther('1'))
      // top up for 2hr's worth of reward
      await topUp(rewarder.address, parseUSDC('7200'), USDC)

      // after 30m, can claim 30m's worth of reward
      // balance: 7200, pending: 1800, claimed: 0, surplus: 5400
      await time.increase(60 * 30) // T+30m
      let [surplus] = await rewarder.rewardTokenSurpluses()
      let { pendingBonusRewards } = await master.pendingTokens(0, user1.address)
      let rewards = pendingBonusRewards[0]
      expect(surplus).to.be.closeTo(parseUSDC('5400'), parseUSDC('10'))
      expect(rewards).to.be.closeTo(parseUSDC('1800'), parseUSDC('10'))
      // emit 1800 USDC, exactly the same amount as pendingTokens
      await master.connect(user1).multiClaim([0])
      const balanceAfterFirstClaim = await USDC.balanceOf(user1.address)
      expect(balanceAfterFirstClaim).to.be.closeTo(rewards, parseUSDC('10'))
      expect((await rewarder.rewardInfos(0)).claimedAmount).to.be.closeTo(rewards, parseUSDC('10'))

      // At T+1h30m, can claim additional 1h worth of reward
      // balance: 5400, pending: 3600, claimed: 1800, surplus: 1800
      await time.increase(60 * 60) // T+1h30m
      ;[surplus] = await rewarder.rewardTokenSurpluses()
      pendingBonusRewards = (await master.pendingTokens(0, user1.address)).pendingBonusRewards
      rewards = pendingBonusRewards[0]
      expect(surplus).to.be.closeTo(parseUSDC('1800'), parseUSDC('10'))
      expect(rewards).to.be.closeTo(parseUSDC('3600'), parseUSDC('10'))
      // emit 3600 USDC, exactly the same amount as pendingTokens
      await master.connect(user1).multiClaim([0])
      const balanceAfterSecondClaim = await USDC.balanceOf(user1.address)
      expect(balanceAfterSecondClaim).to.be.closeTo(rewards.add(balanceAfterFirstClaim), parseUSDC('10'))
      expect((await rewarder.rewardInfos(0)).claimedAmount).to.be.closeTo(parseUSDC('5400'), parseUSDC('10'))

      // At T+2h30m, 30 minutes passed run out time, can claim additional 30m worth of reward
      // balance: 1800, pending: 1800, claimed: 5400, surplus: 0
      await time.increase(60 * 60) // T+2h30m
      ;[surplus] = await rewarder.rewardTokenSurpluses()
      pendingBonusRewards = (await master.pendingTokens(0, user1.address)).pendingBonusRewards
      rewards = pendingBonusRewards[0]
      expect(surplus).to.be.closeTo(parseUSDC('0'), parseUSDC('10'))
      expect(rewards).to.be.closeTo(parseUSDC('1800'), parseUSDC('10'))
      // emit 1800 USDC, exactly the same amount as pendingTokens
      await master.connect(user1).multiClaim([0])
      expect(await USDC.balanceOf(user1.address)).to.be.closeTo(rewards.add(balanceAfterSecondClaim), parseUSDC('10'))
      expect((await rewarder.rewardInfos(0)).claimedAmount).to.be.closeTo(parseUSDC('7200'), parseUSDC('10'))
    })

    it('stops emission when balance runs out. multi-user case', async function () {
      const rewarder = await deployRewarder({
        rewardToken: USDC.address,
        tokenPerSec: parseUSDC('1'),
        lpToken: USDC.address,
      })
      await deposit(user1, master, rewarder, parseEther('1'))
      await deposit(user2, master, rewarder, parseEther('3'))
      // top up for 2hr's worth of reward
      await topUp(rewarder.address, parseUSDC('7200'), USDC)

      // At T+2h30m. reward run out for 30m. both users can only claim 2h's worth of reward, instead of the first one claiming 2h30m and the second zero (with debt).
      // balance: 7200, user1 pending: 7200*(1/(1+3)) = 1800,  user2 pending: 5400, surplus: 0
      await time.increase(60 * 150) // T+2h30m

      const [user1Rewards] = await rewarder.pendingTokens(user1.address)
      const [surplus] = await rewarder.rewardTokenSurpluses()
      expect(user1Rewards).to.be.closeTo(parseUSDC('1800'), parseUSDC('10'))
      expect(surplus).to.be.closeTo(parseUSDC('0'), parseUSDC('10'))
      // emit 1800 USDC, exactly the same amount as pendingTokens
      await master.connect(user1).multiClaim([0])
      expect(await USDC.balanceOf(user1.address)).to.be.closeTo(user1Rewards, parseUSDC('10'))

      const [user2Rewards] = await rewarder.pendingTokens(user2.address)
      expect(user2Rewards).to.be.closeTo(parseUSDC('5400'), parseUSDC('10'))
      // emit 5400 USDC, exactly the same amount as pendingTokens
      await master.connect(user2).multiClaim([0])
      expect(await USDC.balanceOf(user2.address)).to.be.closeTo(user2Rewards, parseUSDC('10'))
    })
  })

  describe('runout timestamp', function () {
    let rewarder: BoostedMultiRewarder

    beforeEach(async function () {
      rewarder = await deployRewarder({
        rewardToken: USDC.address,
        tokenPerSec: parseUSDC('1'),
        lpToken: USDC.address,
      })
    })

    it('extends when balance increases', async function () {
      await deposit(user1, master, rewarder, parseEther('1'))
      await topUp(rewarder.address, parseUSDC('864000'), USDC) // top up 10 days worth of reward
      let [runoutTimestamp] = await rewarder.runoutTimestamps()
      expect(runoutTimestamp).to.be.closeTo((await time.latest()) + 864000, 5)

      await topUp(rewarder.address, parseUSDC('432000'), USDC) // top up 5 more days worth of reward
      ;[runoutTimestamp] = await rewarder.runoutTimestamps()
      // reward should extend to 15 days
      expect(runoutTimestamp).to.be.closeTo((await time.latest()) + 1296000, 5)
    })

    it('is invariant as time passes, until the time passes runoutTimestamp, then it becomes 0', async function () {
      await deposit(user1, master, rewarder, parseEther('1'))
      await topUp(rewarder.address, parseUSDC('864000'), USDC) // top up 10 days worth of reward
      const [runoutTimestamp1] = await rewarder.runoutTimestamps()
      expect(runoutTimestamp1).to.be.closeTo((await time.latest()) + 864000, 5)

      await time.increase(777600) // T+9D
      const [runoutTimestamp2] = await rewarder.runoutTimestamps()
      expect(runoutTimestamp2).to.eq(runoutTimestamp1)

      await time.increase(86340) // T+9D 23H 59M
      const [runoutTimestamp3] = await rewarder.runoutTimestamps()
      expect(runoutTimestamp3).to.eq(runoutTimestamp1)

      await time.increase(60) // T+10D
      const [runoutTimestamp4] = await rewarder.runoutTimestamps()
      expect(runoutTimestamp4).to.eq(0)
    })

    it("is invariant upon onReward(), (users' deposit, withdrawal or claim) even though balance decreases", async function () {
      await deposit(user1, master, rewarder, parseEther('1'))
      await topUp(rewarder.address, parseUSDC('864000'), USDC) // top up 10 days worth of reward
      const [runoutTimestamp1] = await rewarder.runoutTimestamps()
      expect(runoutTimestamp1).to.be.closeTo((await time.latest()) + 864000, 5)

      await time.increase(60) // T+1M
      await deposit(user1, master, rewarder, parseEther('1'))
      const [runoutTimestamp2] = await rewarder.runoutTimestamps()
      expect(runoutTimestamp2).to.eq(runoutTimestamp1)

      await time.increase(60) // T+2M
      await withdraw(user1, master, rewarder, parseEther('1'))
      const [runoutTimestamp3] = await rewarder.runoutTimestamps()
      expect(runoutTimestamp3).to.eq(runoutTimestamp1)

      // balance should have been decreased by 120 (2 minutes worth of reward)
      expect(await USDC.balanceOf(rewarder.address)).to.be.closeTo(parseUSDC('863880'), parseUSDC('10'))
    })
  })

  it('user can call rewarder.emergencyClaimReward() to get the pending tokens.', async function () {
    const rewarder = await deployRewarder({
      rewardToken: USDC.address,
      tokenPerSec: parseUSDC('1'),
      lpToken: DAI.address,
    })
    await deposit(user1, master, rewarder, parseEther('1'))
    await topUp(rewarder.address, parseUSDC('7200'), USDC) // top up 2hr's worth of reward
    await time.increase(3600) // T+1h

    // user1 call emergencyClaimReward before contract is deprecated
    await expect(rewarder.connect(user1).emergencyClaimReward()).to.be.rejectedWith(
      'rewarder / bribe is not deprecated'
    )

    // user1 call emergencyClaimReward directly.
    await rewarder.setIsDeprecated(true)
    await rewarder.connect(user1).emergencyClaimReward()
    // should have emitted 3600 USDC after an hour
    expect(await USDC.balanceOf(user1.address)).to.be.closeTo(parseUSDC('3600'), parseUSDC('10'))
    // emergencyClaimReward should set user.amount to 0
    expect((await rewarder.userBalanceInfo(user1.address)).amount).to.be.equal(constants.Zero)
    // calling emergencyClaimReward again should not yield more reward.
    await time.increase(3600) // T+1h
    await rewarder.connect(user1).emergencyClaimReward()
    expect(await USDC.balanceOf(user1.address)).to.be.closeTo(parseUSDC('3600'), parseUSDC('10'))
  })

  it('should emit event when setIsDeprecated', async function () {
    const rewarder = await deployRewarder({
      rewardToken: USDC.address,
      tokenPerSec: parseUSDC('1'),
      lpToken: DAI.address,
    })
    expect(await rewarder.setIsDeprecated(true))
      .to.emit(rewarder, 'IsDeprecatedUpdated')
      .withArgs(true)
  })

  describe('Emission', function () {
    let rewarder: BoostedMultiRewarder

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
      await topUp(rewarder.address, parseUSDC('1209600'), DAI)
      // top up 14 days' worth of reward.
      // (tokenPerSec is 0 so topping up is actually not needed, but we want to test pendingTokens == 0 because the user did not accumulate any reward, not because of insufficient balance)
      await deposit(user1, master, rewarder, parseDAI('1'))
      await withdraw(user1, master, rewarder, parseDAI('1'))
      expect(await getTotalShares(rewarder)).to.eq(0)
      const { lastRewardTimestamp } = await rewarder.rewardInfos(0)

      // Two weeks later, we activate the rewarder at 1 DAI/s
      await time.increase(14 * 24 * 3600) // T+14d
      await rewarder.setRewardRate(0, parseDAI('1'), 0)
      // Timestamp is updated. If not, a user can steal all the bribe.
      expect((await rewarder.rewardInfos(0)).lastRewardTimestamp).to.eq(lastRewardTimestamp + (14 * 24 * 3600 + 1))

      // The user deposits again after the reward is live.
      // There are no pending rewards from stale lastRewardTimestamp.
      await deposit(user1, master, rewarder, parseDAI('1'))
      const [rewards] = await rewarder.pendingTokens(user1.address)
      expect(rewards).to.be.eq(0)
    })

    it("rewarder should reuse master's partition", async function () {
      // TODO: implement
    })
  })

  interface RewardInfo {
    rewardToken: string
    tokenPerSec: BigNumberish
    lpToken: string
  }

  async function deployRewarder(rewardInfo: RewardInfo) {
    const rewarder = (await ethers.deployContract('BoostedMultiRewarder')) as BoostedMultiRewarder
    await rewarder.initialize(
      AddressZero,
      master.address,
      rewardInfo.lpToken,
      (await time.latest()) + 1, // starts immediately
      rewardInfo.rewardToken,
      rewardInfo.tokenPerSec
    )

    await master.add(rewardInfo.lpToken, rewarder.address)
    await voter.add(master.address, rewardInfo.lpToken, ethers.constants.AddressZero)
    return rewarder
  }

  // Simulate a deposit by increase LP balance in master and calls onReward.
  async function deposit(
    user: SignerWithAddress,
    master: BoostedMasterWombat,
    rewarder: BoostedMultiRewarder,
    amount: BigNumberish
  ) {
    const erc20 = await getLPTokenAsTestERC20(rewarder)
    await topUp(owner.address, amount, erc20)
    const pid = master.getAssetPid(erc20.address)
    return master.depositFor(pid, amount, user.address)
  }

  // Simulate a withdraw by decreasing LP balance in master and calls onReward.
  async function withdraw(
    user: SignerWithAddress,
    master: BoostedMasterWombat,
    rewarder: BoostedMultiRewarder,
    amount: BigNumberish
  ) {
    const erc20 = await getLPTokenAsTestERC20(rewarder)
    const pid = master.getAssetPid(erc20.address)
    return master.connect(user).withdraw(pid, amount)
  }

  async function topUp(address: string, amount: BigNumberish, erc20: Contract = USDC) {
    await erc20.faucet(amount)
    return erc20.transfer(address, amount)
  }

  // Rewarder use master's LP balance as total share.
  async function getTotalShares(rewarder: BoostedMultiRewarder) {
    const erc20 = await getLPTokenAsTestERC20(rewarder)
    const master = await rewarder.masterWombat()
    return erc20.balanceOf(master)
  }

  async function getLPTokenAsTestERC20(rewarder: BoostedMultiRewarder) {
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
