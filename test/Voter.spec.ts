import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import chai, { expect } from 'chai'
import { BigNumber } from 'ethers'
import { formatEther, parseEther, parseUnits } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import {
  Asset,
  Asset__factory,
  Bribe,
  Bribe__factory,
  ERC20,
  MasterWombatV3,
  MasterWombatV3__factory,
  MockERC20__factory,
  MockVeWom,
  MockVeWom__factory,
  Voter,
  Voter__factory,
  WombatERC20,
  WombatERC20__factory,
} from '../build/typechain'
import { near } from './assertions/near'
import { roughlyNear } from './assertions/roughlyNear'
import { advanceTimeAndBlock, latest } from './helpers'

chai.use(near)
chai.use(roughlyNear)

const AddressZero = ethers.constants.AddressZero

// Start test block
describe('Voter', async function () {
  let owner: SignerWithAddress
  let users: SignerWithAddress[]

  let Wom: WombatERC20__factory
  let VeWom: MockVeWom__factory
  let Voter: Voter__factory
  let MasterWombat: MasterWombatV3__factory
  let Asset: Asset__factory
  let Bribe: Bribe__factory
  let MockERC20: MockERC20__factory

  let wom: WombatERC20
  let veWom: MockVeWom
  let voter: Voter
  let mw: MasterWombatV3
  let token1: ERC20
  let token2: ERC20
  let token3: ERC20
  let lpToken1: Asset
  let lpToken2: Asset
  let lpToken3: Asset
  let bribe: Bribe
  let bribeToken: ERC20

  let womPerSec: BigNumber
  let partnerRewardPerSec: BigNumber

  before(async function () {
    ;[owner, ...users] = await ethers.getSigners()

    Wom = (await ethers.getContractFactory('WombatERC20')) as WombatERC20__factory
    MasterWombat = (await ethers.getContractFactory('MasterWombatV3')) as MasterWombatV3__factory
    VeWom = (await ethers.getContractFactory('MockVeWom')) as MockVeWom__factory
    Voter = (await ethers.getContractFactory('Voter')) as Voter__factory
    Asset = (await ethers.getContractFactory('Asset')) as Asset__factory
    Bribe = (await ethers.getContractFactory('Bribe')) as Bribe__factory
    MockERC20 = (await ethers.getContractFactory('MockERC20')) as MockERC20__factory

    // distribute 2.4M WOM each month
    womPerSec = parseEther('0.9259259259259259')

    // distribute 1 M partner token in 1 month
    partnerRewardPerSec = parseEther('0.380517503805175')
  })

  beforeEach(async function () {
    wom = await Wom.deploy(owner.address, owner.address)

    mw = await MasterWombat.deploy()
    veWom = await VeWom.deploy()
    voter = await Voter.deploy()

    await wom.deployed()
    await mw.deployed()
    await mw.initialize(wom.address, veWom.address, voter.address, 1000)

    await veWom.deployed()
    await veWom.initialize(wom.address, mw.address)

    await voter.deployed()
    const startTime = await latest()
    await voter.initialize(wom.address, veWom.address, womPerSec, startTime, startTime.add(86400 * 7), 0)

    await veWom.setVoter(voter.address)
    await wom.transfer(voter.address, parseEther('100000000'))

    await veWom.connect(users[0]).faucet(parseEther('10000'))
    await veWom.connect(users[1]).faucet(parseEther('10000'))

    token1 = await MockERC20.deploy('USDC Token', 'USDC', 6, 0)
    token2 = await MockERC20.deploy('USDT Token', 'USDT', 6, 0)
    token3 = await MockERC20.deploy('DAI Token', 'DAI', 18, 0)

    await token1.deployed()
    await token2.deployed()
    await token3.deployed()

    lpToken1 = await Asset.deploy(token1.address, 'USDC', 'LP-USDC')
    lpToken2 = await Asset.deploy(token2.address, 'USDT', 'LP-USDT')
    lpToken3 = await Asset.deploy(token3.address, 'DAI', 'LP-DAI')

    // grant owner permission to mint
    await lpToken1.setPool(owner.address)
    await lpToken2.setPool(owner.address)
    await lpToken3.setPool(owner.address)

    await lpToken1.mint(owner.address, parseUnits('10000000000'))
    await lpToken2.mint(owner.address, parseUnits('10000000000'))
    await lpToken3.mint(owner.address, parseUnits('10000000000'))
  })

  describe('Vote', async function () {
    beforeEach(async function () {
      await voter.add(mw.address, lpToken1.address, AddressZero)
      await voter.add(mw.address, lpToken2.address, AddressZero)
      await voter.add(mw.address, lpToken3.address, AddressZero)
    })

    it('multi vote 1', async function () {
      await voter.connect(users[0]).vote([lpToken1.address, lpToken2.address], [parseEther('20'), parseEther('30')])
      await voter.connect(users[1]).vote([lpToken2.address, lpToken3.address], [parseEther('10'), parseEther('10')])

      expect(await voter.votes(users[0].address, lpToken1.address)).equals(parseEther('20'))
      expect(await voter.votes(users[0].address, lpToken2.address)).equals(parseEther('30'))

      expect(await voter.votes(users[1].address, lpToken2.address)).equals(parseEther('10'))
      expect(await voter.votes(users[1].address, lpToken3.address)).equals(parseEther('10'))

      expect((await voter.weights(lpToken1.address)).voteWeight).equals(parseEther('20'))
      expect((await voter.weights(lpToken2.address)).voteWeight).equals(parseEther('40'))
      expect((await voter.weights(lpToken3.address)).voteWeight).equals(parseEther('10'))

      expect(await voter.totalWeight()).equals(parseEther('70'))
    })

    it('multi vote 2', async function () {
      await voter.connect(users[0]).vote([lpToken1.address, lpToken2.address], [parseEther('20'), parseEther('30')])
      await voter.connect(users[0]).vote([lpToken1.address, lpToken3.address], [parseEther('5'), parseEther('5')])
      await voter.connect(users[0]).vote([lpToken3.address], [parseEther('100')])

      expect(await voter.votes(users[0].address, lpToken1.address)).equals(parseEther('25'))
      expect(await voter.votes(users[0].address, lpToken2.address)).equals(parseEther('30'))
      expect(await voter.votes(users[0].address, lpToken3.address)).equals(parseEther('105'))

      expect((await voter.weights(lpToken1.address)).voteWeight).equals(parseEther('25'))
      expect((await voter.weights(lpToken2.address)).voteWeight).equals(parseEther('30'))
      expect((await voter.weights(lpToken3.address)).voteWeight).equals(parseEther('105'))

      expect(await voter.totalWeight()).equals(parseEther('160'))
    })

    it('unvote', async function () {
      await voter.connect(users[0]).vote([lpToken1.address, lpToken2.address], [parseEther('5'), parseEther('30')])
      await voter.connect(users[0]).vote([lpToken1.address, lpToken2.address], [parseEther('-5'), parseEther('-5')])

      expect(await voter.votes(users[0].address, lpToken1.address)).equals(parseEther('0'))
      expect(await voter.votes(users[0].address, lpToken2.address)).equals(parseEther('25'))

      expect((await voter.weights(lpToken1.address)).voteWeight).equals(parseEther('0'))
      expect((await voter.weights(lpToken2.address)).voteWeight).equals(parseEther('25'))

      expect(await voter.totalWeight()).equals(parseEther('25'))

      // shouldn't be able to unvote more than he/she has voted
      await voter.connect(users[1]).vote([lpToken1.address], [parseEther('10')])
      await expect(voter.connect(users[0]).vote([lpToken1.address], [parseEther('-1')])).to.be.revertedWith(
        'voter: vote underflow'
      )
    })

    it('0 vote', async function () {
      await voter.connect(users[0]).vote([lpToken1.address, lpToken2.address], [parseEther('5'), parseEther('0')])
      await voter.connect(users[0]).vote([lpToken1.address, lpToken2.address], [parseEther('0'), parseEther('5')])

      expect(await voter.votes(users[0].address, lpToken1.address)).equals(parseEther('5'))
      expect(await voter.votes(users[0].address, lpToken2.address)).equals(parseEther('5'))

      expect((await voter.weights(lpToken1.address)).voteWeight).equals(parseEther('5'))
      expect((await voter.weights(lpToken2.address)).voteWeight).equals(parseEther('5'))

      expect(await voter.totalWeight()).equals(parseEther('10'))
    })

    it('duplicating LP token', async function () {
      await voter.connect(users[0]).vote([lpToken1.address, lpToken1.address], [parseEther('5'), parseEther('5')])
      expect(await voter.votes(users[0].address, lpToken1.address)).equals(parseEther('10'))
      expect((await voter.weights(lpToken1.address)).voteWeight).equals(parseEther('10'))
      expect(await voter.totalWeight()).equals(parseEther('10'))
    })

    it('vote an unexisting pool', async function () {
      await expect(voter.connect(users[2]).vote([AddressZero], [5])).to.be.revertedWith('Voter: gaugeManager not exist')
    })
  })

  describe('Distribute WOM', async function () {
    beforeEach(async function () {
      await mw.add(lpToken1.address, AddressZero)
      await mw.add(lpToken2.address, AddressZero)
      await mw.add(lpToken3.address, AddressZero)

      await voter.add(mw.address, lpToken1.address, AddressZero)
      await voter.add(mw.address, lpToken2.address, AddressZero)
      await voter.add(mw.address, lpToken3.address, AddressZero)

      // approvals
      await lpToken1.transfer(users[0].address, parseUnits('100000'))
      await lpToken2.transfer(users[0].address, parseUnits('100000'))
      await lpToken3.transfer(users[0].address, parseEther('100000'))

      await lpToken1.transfer(users[1].address, parseUnits('100000'))
      await lpToken2.transfer(users[1].address, parseUnits('100000'))
      await lpToken3.transfer(users[1].address, parseEther('100000'))

      await lpToken1.connect(users[0]).approve(mw.address, parseEther('1000000000'))
      await lpToken2.connect(users[0]).approve(mw.address, parseEther('1000000000'))
      await lpToken3.connect(users[0]).approve(mw.address, parseEther('1000000000'))

      await lpToken1.connect(users[1]).approve(mw.address, parseEther('1000000000'))
      await lpToken2.connect(users[1]).approve(mw.address, parseEther('1000000000'))
      await lpToken3.connect(users[1]).approve(mw.address, parseEther('1000000000'))
    })

    describe('Base Allocation', async function () {
      beforeEach(async function () {
        await voter.setBaseAllocation(1000)
      })

      it('Single User', async function () {
        await voter.setAllocPoint(lpToken1.address, parseEther('10'))
        await voter.setAllocPoint(lpToken2.address, parseEther('20'))
        await voter.setAllocPoint(lpToken3.address, parseEther('30'))

        await mw.connect(users[0]).deposit(0, parseUnits('0.0001'))
        await mw.connect(users[0]).deposit(1, parseUnits('1'))
        await mw.connect(users[0]).deposit(2, parseEther('10000'))

        // wait for the next epoch start
        await advanceTimeAndBlock(86400 * 7)

        // should have been accumulated for 1 week
        expect(await voter.pendingWom(lpToken1.address)).near(parseEther('93330'))
        expect(await voter.pendingWom(lpToken2.address)).near(parseEther('186700'))

        // trigger Voter.distribute
        const receipt1 = mw.connect(users[0]).multiClaim([0, 1, 2])
        await expect(receipt1).to.emit(voter, 'DistributeReward')

        // claim reward
        await advanceTimeAndBlock(600)

        expect(await voter.pendingWom(lpToken1.address)).roughlyNear(parseEther('92.703'))
        expect(await voter.pendingWom(lpToken2.address)).roughlyNear(parseEther('186.03'))

        expect((await mw.pendingTokens(0, users[0].address)).pendingRewards).roughlyNear(parseEther('92.701'))
        const balance1: BigNumber = await wom.balanceOf(users[0].address)
        await mw.connect(users[0]).multiClaim([0])
        const balance2: BigNumber = await wom.balanceOf(users[0].address)
        expect(balance2.sub(balance1)).roughlyNear(parseEther('92.702'))

        expect((await mw.pendingTokens(1, users[0].address)).pendingRewards).roughlyNear(parseEther('186.01'))
        await mw.connect(users[0]).multiClaim([1])
        const balance3 = await wom.balanceOf(users[0].address)
        expect(balance3.sub(balance2)).roughlyNear(parseEther('186.02'))

        expect((await mw.pendingTokens(2, users[0].address)).pendingRewards).roughlyNear(parseEther('279.01'))
        await mw.connect(users[0]).multiClaim([2])
        const balance4 = await wom.balanceOf(users[0].address)
        expect(balance4.sub(balance3)).roughlyNear(parseEther('279.02'))

        // claim again
        await advanceTimeAndBlock(600)
        expect(await voter.pendingWom(lpToken1.address)).roughlyNear(parseEther('185'))

        expect((await mw.pendingTokens(0, users[0].address)).pendingRewards).roughlyNear(parseEther('92.701'))
        const balance5: BigNumber = await wom.balanceOf(users[0].address)
        await mw.connect(users[0]).multiClaim([0])
        const balance6: BigNumber = await wom.balanceOf(users[0].address)
        expect(balance6.sub(balance5)).roughlyNear(parseEther('93.02'))

        // withdraw, deposit and claim again, the same reward is expected
        await advanceTimeAndBlock(600)
        await mw.connect(users[0]).withdraw(0, parseUnits('0.0001'))

        await advanceTimeAndBlock(600)
        await mw.connect(users[0]).deposit(0, parseUnits('0.0001'))

        await advanceTimeAndBlock(600)
        expect(await voter.pendingWom(lpToken1.address)).roughlyNear(parseEther('464'))

        expect((await mw.pendingTokens(0, users[0].address)).pendingRewards).roughlyNear(parseEther('93.01'))
        const balance7: BigNumber = await wom.balanceOf(users[0].address)
        await mw.connect(users[0]).multiClaim([0])
        const balance8: BigNumber = await wom.balanceOf(users[0].address)
        expect(balance8.sub(balance7)).roughlyNear(parseEther('93.002'))
      })

      it('Multiple Epochs', async function () {
        await voter.setAllocPoint(lpToken1.address, parseEther('1'))
        await voter.setAllocPoint(lpToken2.address, parseEther('2'))
        await voter.setAllocPoint(lpToken3.address, parseEther('3'))

        await mw.connect(users[0]).deposit(0, parseUnits('0.0001'))
        await mw.connect(users[0]).deposit(1, parseUnits('1'))
        await mw.connect(users[0]).deposit(2, parseEther('10000'))

        // wait for the next epoch start
        await advanceTimeAndBlock(86400 * 7)

        // should have been accumulated for 1 week
        expect(await voter.pendingWom(lpToken1.address)).near(parseEther('93330'))
        expect(await voter.pendingWom(lpToken2.address)).near(parseEther('186700'))
        expect(await voter.pendingWom(lpToken3.address)).near(parseEther('279990'))

        // trigger Voter.distribute
        const receipt1 = mw.connect(users[0]).multiClaim([0, 1, 2])
        await expect(receipt1).to.emit(voter, 'DistributeReward')

        // claim reward
        await advanceTimeAndBlock(600)

        expect((await mw.pendingTokens(0, users[0].address)).pendingRewards).roughlyNear(parseEther('92.701'))
        let balance1: BigNumber = await wom.balanceOf(users[0].address)
        await mw.connect(users[0]).multiClaim([0])
        let balance2: BigNumber = await wom.balanceOf(users[0].address)
        expect(balance2.sub(balance1)).roughlyNear(parseEther('92.702'))

        expect((await mw.pendingTokens(1, users[0].address)).pendingRewards).roughlyNear(parseEther('186.01'))
        await mw.connect(users[0]).multiClaim([1])
        let balance3 = await wom.balanceOf(users[0].address)
        expect(balance3.sub(balance2)).roughlyNear(parseEther('186.02'))

        expect((await mw.pendingTokens(2, users[0].address)).pendingRewards).roughlyNear(parseEther('279.01'))
        await mw.connect(users[0]).multiClaim([2])
        let balance4 = await wom.balanceOf(users[0].address)
        expect(balance4.sub(balance3)).roughlyNear(parseEther('279.02'))

        // pass 1 day, change voting
        await advanceTimeAndBlock(86400 - 600)
        await voter.setAllocPoint(lpToken1.address, parseEther('3001'))
        await voter.setAllocPoint(lpToken2.address, parseEther('2002'))
        await voter.setAllocPoint(lpToken3.address, parseEther('1003'))

        expect(await voter.pendingWom(lpToken1.address)).roughlyNear(parseEther('13300'))
        expect(await voter.pendingWom(lpToken2.address)).roughlyNear(parseEther('26600'))
        expect(await voter.pendingWom(lpToken3.address)).roughlyNear(parseEther('39900'))

        // pass 6 day
        await advanceTimeAndBlock(86400 * 6)

        // should have been accumulated for 1 week
        expect(await voter.pendingWom(lpToken1.address)).roughlyNear(parseEther('251700')) // 13300 + 238400
        expect(await voter.pendingWom(lpToken2.address)).near(parseEther('186700')) // 26600 + 160100
        expect(await voter.pendingWom(lpToken3.address)).near(parseEther('120160')) // 39900 + 81700

        // trigger Voter.distribute
        const receipt2 = mw.connect(users[0]).multiClaim([0, 1, 2])
        await expect(receipt2).to.emit(voter, 'DistributeReward')

        // claim reward
        await advanceTimeAndBlock(600)

        expect((await mw.pendingTokens(0, users[0].address)).pendingRewards).roughlyNear(parseEther('250.01'))
        balance1 = await wom.balanceOf(users[0].address)
        await mw.connect(users[0]).multiClaim([0])
        balance2 = await wom.balanceOf(users[0].address)
        expect(balance2.sub(balance1)).roughlyNear(parseEther('250.02'))

        expect((await mw.pendingTokens(1, users[0].address)).pendingRewards).roughlyNear(parseEther('186.01'))
        await mw.connect(users[0]).multiClaim([1])
        balance3 = await wom.balanceOf(users[0].address)
        expect(balance3.sub(balance2)).roughlyNear(parseEther('186.02'))

        expect((await mw.pendingTokens(2, users[0].address)).pendingRewards).roughlyNear(parseEther('121.01'))
        await mw.connect(users[0]).multiClaim([2])
        balance4 = await wom.balanceOf(users[0].address)
        expect(balance4.sub(balance3)).roughlyNear(parseEther('121.02'))
      })

      it('Multiple Users', async function () {
        await voter.setAllocPoint(lpToken1.address, parseEther('1'))
        await voter.setAllocPoint(lpToken2.address, parseEther('1'))
        await voter.setAllocPoint(lpToken3.address, parseEther('1'))

        // wait for the next epoch start
        await advanceTimeAndBlock(86400 * 7)

        // trigger Voter.distribute
        await mw.connect(users[0]).multiClaim([0, 1, 2])

        await mw.connect(users[0]).deposit(0, parseUnits('0.0001'))
        await mw.connect(users[0]).deposit(1, parseUnits('1'))
        await mw.connect(users[0]).deposit(2, parseEther('10000'))

        // user 1 deposit 10x of user 0
        await mw.connect(users[1]).deposit(0, parseUnits('0.001'))
        await mw.connect(users[1]).deposit(1, parseUnits('10'))
        await mw.connect(users[1]).deposit(2, parseEther('100000'))

        // claim token 1
        await advanceTimeAndBlock(600)

        await mw.connect(users[0]).multiClaim([0])
        await mw.connect(users[1]).multiClaim([0])
        const balance1 = await wom.balanceOf(users[0].address)
        const balance2 = await wom.balanceOf(users[1].address)

        expect(balance1).roughlyNear(parseEther('17.845'))
        expect(balance2).roughlyNear(parseEther('169.47'))

        // claim token 2
        expect((await mw.pendingTokens(1, users[0].address)).pendingRewards).roughlyNear(parseEther('17.8'))
        expect((await mw.pendingTokens(1, users[1].address)).pendingRewards).roughlyNear(parseEther('169'))
        expect((await mw.pendingTokens(2, users[0].address)).pendingRewards).roughlyNear(parseEther('17.8'))
        expect((await mw.pendingTokens(2, users[1].address)).pendingRewards).roughlyNear(parseEther('169'))

        await mw.connect(users[0]).multiClaim([1, 2])
        await mw.connect(users[1]).multiClaim([1, 2])
        const balance3 = await wom.balanceOf(users[0].address)
        const balance4 = await wom.balanceOf(users[1].address)

        // user[0] claim amount
        expect(balance3.sub(balance1)).roughlyNear(parseEther('35.718'))
        // user[1] claim amount
        expect(balance4.sub(balance2)).near(parseEther('339.5'))
      })
    })

    describe('Vote Allocation', async function () {
      it('Single User', async function () {
        await voter
          .connect(users[0])
          .vote(
            [lpToken1.address, lpToken2.address, lpToken3.address],
            [parseEther('10'), parseEther('20'), parseEther('30')]
          )

        await mw.connect(users[0]).deposit(0, parseUnits('0.0001'))
        await mw.connect(users[0]).deposit(1, parseUnits('1'))
        await mw.connect(users[0]).deposit(2, parseEther('10000'))

        // wait for the next epoch start
        await advanceTimeAndBlock(86400 * 7)

        // should have been accumulated for 1 week
        expect(await voter.pendingWom(lpToken1.address)).near(parseEther('93330'))
        expect(await voter.pendingWom(lpToken2.address)).near(parseEther('186700'))

        // trigger Voter.distribute
        const receipt1 = mw.connect(users[0]).multiClaim([0, 1, 2])
        await expect(receipt1).to.emit(voter, 'DistributeReward')

        // claim reward
        await advanceTimeAndBlock(600)

        expect(await voter.pendingWom(lpToken1.address)).roughlyNear(parseEther('92.703'))
        expect(await voter.pendingWom(lpToken2.address)).roughlyNear(parseEther('186.03'))

        expect((await mw.pendingTokens(0, users[0].address)).pendingRewards).roughlyNear(parseEther('92.701'))
        const balance1: BigNumber = await wom.balanceOf(users[0].address)
        await mw.connect(users[0]).multiClaim([0])
        const balance2: BigNumber = await wom.balanceOf(users[0].address)
        expect(balance2.sub(balance1)).roughlyNear(parseEther('92.702'))

        expect((await mw.pendingTokens(1, users[0].address)).pendingRewards).roughlyNear(parseEther('186.01'))
        await mw.connect(users[0]).multiClaim([1])
        const balance3 = await wom.balanceOf(users[0].address)
        expect(balance3.sub(balance2)).roughlyNear(parseEther('186.02'))

        expect((await mw.pendingTokens(2, users[0].address)).pendingRewards).roughlyNear(parseEther('279.01'))
        await mw.connect(users[0]).multiClaim([2])
        const balance4 = await wom.balanceOf(users[0].address)
        expect(balance4.sub(balance3)).roughlyNear(parseEther('279.02'))

        // claim again
        await advanceTimeAndBlock(600)
        expect(await voter.pendingWom(lpToken1.address)).roughlyNear(parseEther('185'))

        expect((await mw.pendingTokens(0, users[0].address)).pendingRewards).roughlyNear(parseEther('92.701'))
        const balance5: BigNumber = await wom.balanceOf(users[0].address)
        await mw.connect(users[0]).multiClaim([0])
        const balance6: BigNumber = await wom.balanceOf(users[0].address)
        expect(balance6.sub(balance5)).roughlyNear(parseEther('93.02'))

        // withdraw, deposit and claim again, the same reward is expected
        await advanceTimeAndBlock(600)
        await mw.connect(users[0]).withdraw(0, parseUnits('0.0001'))

        await advanceTimeAndBlock(600)
        await mw.connect(users[0]).deposit(0, parseUnits('0.0001'))

        await advanceTimeAndBlock(600)
        expect(await voter.pendingWom(lpToken1.address)).roughlyNear(parseEther('464'))

        expect((await mw.pendingTokens(0, users[0].address)).pendingRewards).roughlyNear(parseEther('93.01'))
        const balance7: BigNumber = await wom.balanceOf(users[0].address)
        await mw.connect(users[0]).multiClaim([0])
        const balance8: BigNumber = await wom.balanceOf(users[0].address)
        expect(balance8.sub(balance7)).roughlyNear(parseEther('93.002'))
      })

      it('Multiple Epochs', async function () {
        await voter
          .connect(users[0])
          .vote(
            [lpToken1.address, lpToken2.address, lpToken3.address],
            [parseEther('10'), parseEther('20'), parseEther('30')]
          )

        await mw.connect(users[0]).deposit(0, parseUnits('0.0001'))
        await mw.connect(users[0]).deposit(1, parseUnits('1'))
        await mw.connect(users[0]).deposit(2, parseEther('10000'))

        // wait for the next epoch start
        await advanceTimeAndBlock(86400 * 7)

        // should have been accumulated for 1 week
        expect(await voter.pendingWom(lpToken1.address)).near(parseEther('93330'))
        expect(await voter.pendingWom(lpToken2.address)).near(parseEther('186700'))
        expect(await voter.pendingWom(lpToken3.address)).near(parseEther('279990'))

        // trigger Voter.distribute
        const receipt1 = mw.connect(users[0]).multiClaim([0, 1, 2])
        await expect(receipt1).to.emit(voter, 'DistributeReward')

        // claim reward
        await advanceTimeAndBlock(600)

        expect((await mw.pendingTokens(0, users[0].address)).pendingRewards).roughlyNear(parseEther('92.701'))
        let balance1: BigNumber = await wom.balanceOf(users[0].address)
        await mw.connect(users[0]).multiClaim([0])
        let balance2: BigNumber = await wom.balanceOf(users[0].address)
        expect(balance2.sub(balance1)).roughlyNear(parseEther('92.702'))

        expect((await mw.pendingTokens(1, users[0].address)).pendingRewards).roughlyNear(parseEther('186.01'))
        await mw.connect(users[0]).multiClaim([1])
        let balance3 = await wom.balanceOf(users[0].address)
        expect(balance3.sub(balance2)).roughlyNear(parseEther('186.02'))

        expect((await mw.pendingTokens(2, users[0].address)).pendingRewards).roughlyNear(parseEther('279.01'))
        await mw.connect(users[0]).multiClaim([2])
        let balance4 = await wom.balanceOf(users[0].address)
        expect(balance4.sub(balance3)).roughlyNear(parseEther('279.02'))

        // pass 1 day, change voting
        await advanceTimeAndBlock(86400 - 600)
        await voter
          .connect(users[0])
          .vote(
            [lpToken1.address, lpToken2.address, lpToken3.address],
            [parseEther('3000'), parseEther('2000'), parseEther('1000')]
          )

        expect(await voter.pendingWom(lpToken1.address)).roughlyNear(parseEther('13300'))
        expect(await voter.pendingWom(lpToken2.address)).roughlyNear(parseEther('26600'))
        expect(await voter.pendingWom(lpToken3.address)).roughlyNear(parseEther('39900'))

        // pass 6 day
        await advanceTimeAndBlock(86400 * 6)

        // should have been accumulated for 1 week
        expect(await voter.pendingWom(lpToken1.address)).roughlyNear(parseEther('251700')) // 13300 + 238400
        expect(await voter.pendingWom(lpToken2.address)).near(parseEther('186700')) // 26600 + 160100
        expect(await voter.pendingWom(lpToken3.address)).near(parseEther('121600')) // 39900 + 81700

        // trigger Voter.distribute
        const receipt2 = mw.connect(users[0]).multiClaim([0, 1, 2])
        await expect(receipt2).to.emit(voter, 'DistributeReward')

        // claim reward
        await advanceTimeAndBlock(600)

        expect((await mw.pendingTokens(0, users[0].address)).pendingRewards).roughlyNear(parseEther('250.01'))
        balance1 = await wom.balanceOf(users[0].address)
        await mw.connect(users[0]).multiClaim([0])
        balance2 = await wom.balanceOf(users[0].address)
        expect(balance2.sub(balance1)).roughlyNear(parseEther('250.02'))

        expect((await mw.pendingTokens(1, users[0].address)).pendingRewards).roughlyNear(parseEther('186.01'))
        await mw.connect(users[0]).multiClaim([1])
        balance3 = await wom.balanceOf(users[0].address)
        expect(balance3.sub(balance2)).roughlyNear(parseEther('186.02'))

        expect((await mw.pendingTokens(2, users[0].address)).pendingRewards).roughlyNear(parseEther('121.01'))
        await mw.connect(users[0]).multiClaim([2])
        balance4 = await wom.balanceOf(users[0].address)
        expect(balance4.sub(balance3)).roughlyNear(parseEther('121.02'))
      })

      it('Multiple Users', async function () {
        await voter
          .connect(users[0])
          .vote(
            [lpToken1.address, lpToken2.address, lpToken3.address],
            [parseEther('1'), parseEther('1'), parseEther('1')]
          )

        // wait for the next epoch start
        await advanceTimeAndBlock(86400 * 7)

        // trigger Voter.distribute
        await mw.connect(users[0]).multiClaim([0, 1, 2])

        await mw.connect(users[0]).deposit(0, parseUnits('0.0001'))
        await mw.connect(users[0]).deposit(1, parseUnits('1'))
        await mw.connect(users[0]).deposit(2, parseEther('10000'))

        // user 1 deposit 10x of user 0
        await mw.connect(users[1]).deposit(0, parseUnits('0.001'))
        await mw.connect(users[1]).deposit(1, parseUnits('10'))
        await mw.connect(users[1]).deposit(2, parseEther('100000'))

        // claim token 1
        await advanceTimeAndBlock(600)

        await mw.connect(users[0]).multiClaim([0])
        await mw.connect(users[1]).multiClaim([0])
        const balance1 = await wom.balanceOf(users[0].address)
        const balance2 = await wom.balanceOf(users[1].address)

        expect(balance1).roughlyNear(parseEther('17.845'))
        expect(balance2).roughlyNear(parseEther('169.47'))

        // claim token 2
        expect((await mw.pendingTokens(1, users[0].address)).pendingRewards).roughlyNear(parseEther('17.8'))
        expect((await mw.pendingTokens(1, users[1].address)).pendingRewards).roughlyNear(parseEther('169'))
        expect((await mw.pendingTokens(2, users[0].address)).pendingRewards).roughlyNear(parseEther('17.8'))
        expect((await mw.pendingTokens(2, users[1].address)).pendingRewards).roughlyNear(parseEther('169'))

        await mw.connect(users[0]).multiClaim([1, 2])
        await mw.connect(users[1]).multiClaim([1, 2])
        const balance3 = await wom.balanceOf(users[0].address)
        const balance4 = await wom.balanceOf(users[1].address)

        // user[0] claim amount
        expect(balance3.sub(balance1)).roughlyNear(parseEther('35.718'))
        // user[1] claim amount
        expect(balance4.sub(balance2)).near(parseEther('339.23'))
      })

      it('Base Allocation + Vote Allocation', async function () {
        await voter.setBaseAllocation(600)

        await voter.setAllocPoint(lpToken1.address, parseEther('1'))
        await voter.setAllocPoint(lpToken2.address, parseEther('2'))
        await voter.setAllocPoint(lpToken3.address, parseEther('3'))

        await advanceTimeAndBlock(86400 * 4)

        expect(await voter.pendingWom(lpToken1.address)).roughlyNear(parseEther('32000'))
        expect(await voter.pendingWom(lpToken2.address)).roughlyNear(parseEther('64000'))
        expect(await voter.pendingWom(lpToken3.address)).roughlyNear(parseEther('96000'))

        await voter.connect(users[0]).vote([lpToken1.address, lpToken2.address], [parseEther('200'), parseEther('100')])

        await mw.connect(users[0]).deposit(0, parseUnits('0.0001'))
        await mw.connect(users[0]).deposit(1, parseUnits('1'))
        await mw.connect(users[0]).deposit(2, parseEther('10000'))

        // wait for the next epoch start
        await advanceTimeAndBlock(86400 * 3)

        // should have been accumulated for 1 week
        // 120k, 92k
        expect(await voter.pendingWom(lpToken1.address)).near(parseEther('120000')) // 560000 * (0.6 * 1/6 + 0.4 * 3/7 * 200/300)
        expect(await voter.pendingWom(lpToken2.address)).near(parseEther('144000')) // 560000 * (0.6 * 2/6 + 0.4 * 3/7 * 100/300)
        expect(await voter.pendingWom(lpToken3.address)).near(parseEther('168000')) // 560000 * 0.6 * 3/6

        // trigger Voter.distribute
        const receipt1 = mw.connect(users[0]).multiClaim([0, 1, 2])
        await expect(receipt1).to.emit(voter, 'DistributeReward')

        // claim reward
        await advanceTimeAndBlock(600)

        expect((await mw.pendingTokens(0, users[0].address)).pendingRewards).roughlyNear(parseEther('119'))
        const balance1: BigNumber = await wom.balanceOf(users[0].address)
        await mw.connect(users[0]).multiClaim([0])
        const balance2: BigNumber = await wom.balanceOf(users[0].address)
        expect(balance2.sub(balance1)).roughlyNear(parseEther('119'))

        expect((await mw.pendingTokens(1, users[0].address)).pendingRewards).roughlyNear(parseEther('143'))
        await mw.connect(users[0]).multiClaim([1])
        const balance3 = await wom.balanceOf(users[0].address)
        expect(balance3.sub(balance2)).roughlyNear(parseEther('143'))

        expect((await mw.pendingTokens(2, users[0].address)).pendingRewards).roughlyNear(parseEther('167'))
        await mw.connect(users[0]).multiClaim([2])
        const balance4 = await wom.balanceOf(users[0].address)
        expect(balance4.sub(balance3)).roughlyNear(parseEther('167'))
      })
    })
  })

  describe('VE', async function () {
    beforeEach(async function () {
      await voter.add(mw.address, lpToken1.address, AddressZero)
      await voter.add(mw.address, lpToken2.address, AddressZero)
      await voter.add(mw.address, lpToken3.address, AddressZero)
    })

    it('only owner can set voter', async function () {
      await expect(veWom.connect(users[0]).setVoter(voter.address)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('only owner can add mw', async function () {
      await expect(voter.connect(users[0]).add(mw.address, lpToken3.address, AddressZero)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('only owner can pause mw', async function () {
      await expect(voter.connect(users[0]).pauseVoteEmission(lpToken3.address)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('only owner can resume mw', async function () {
      await expect(voter.connect(users[0]).resumeVoteEmission(lpToken3.address)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('only owner can set mw', async function () {
      await expect(voter.connect(users[0]).setGauge(lpToken3.address, mw.address)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('only owner can set bribe', async function () {
      await expect(voter.connect(users[0]).setBribe(lpToken3.address, AddressZero)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('respect vote limit (+vote)', async function () {
      await expect(voter.connect(users[2]).vote([lpToken1.address], [5])).to.be.revertedWith('VeWom: not enough vote')

      await veWom.connect(users[2]).faucet(100)
      await expect(voter.connect(users[2]).vote([lpToken1.address, lpToken2.address], [50, 51])).to.be.revertedWith(
        'VeWom: not enough vote'
      )

      // different LP tokens
      await voter.connect(users[2]).vote([lpToken1.address, lpToken2.address], [40, 50])

      // the same LP tokens
      await voter.connect(users[2]).vote([lpToken1.address, lpToken1.address], [5, 5])

      await expect(voter.connect(users[2]).vote([lpToken1.address], [1])).to.be.revertedWith('VeWom: not enough vote')
    })

    it('respect vote limit (burn)', async function () {
      await veWom.connect(users[2]).faucet(100)
      await voter.connect(users[2]).vote([lpToken1.address, lpToken2.address], [25, 25])

      // can burn veWOM not used
      await veWom.connect(users[2]).burn2(50)

      // cannot burn veWOM used
      await expect(veWom.connect(users[2]).burn2(1)).to.be.revertedWith('VeWom: not enough vote')
    })
  })

  describe('Whitelist', async function () {
    it('cannot add the same lp token', async function () {
      await voter.add(mw.address, lpToken1.address, AddressZero)
      await expect(voter.add(mw.address, lpToken1.address, AddressZero)).to.be.revertedWith('voter: already added')
    })

    it('can pause WOM emission', async function () {
      await voter.add(mw.address, lpToken1.address, AddressZero)
      await voter.pauseVoteEmission(lpToken1.address)

      // already paused
      await expect(voter.pauseVoteEmission(lpToken1.address)).to.be.revertedWith('voter: not whitelisted')
    })

    it('pause should stop emit WOM rewards (base not stopped)', async function () {
      // prepare
      await mw.add(lpToken1.address, AddressZero)
      await mw.add(lpToken2.address, AddressZero)
      await mw.add(lpToken3.address, AddressZero)

      await voter.add(mw.address, lpToken1.address, AddressZero)
      await voter.add(mw.address, lpToken2.address, AddressZero)
      await voter.add(mw.address, lpToken3.address, AddressZero)

      await lpToken1.transfer(users[0].address, parseUnits('100000'))
      await lpToken1.connect(users[0]).approve(mw.address, parseEther('1000000000'))

      // vote & deposit
      await voter
        .connect(users[0])
        .vote(
          [lpToken1.address, lpToken2.address, lpToken3.address],
          [parseEther('10'), parseEther('20'), parseEther('30')]
        )
      await mw.connect(users[0]).deposit(0, parseUnits('1'))

      // All emission are vote based
      expect(await voter.baseAllocation()).to.eq(0)

      // wait for the next epoch start
      await advanceTimeAndBlock(86400 * 7) // epoch
      await mw.connect(users[0]).multiClaim([0, 1, 2])
      expect(await wom.balanceOf(users[0].address)).near(ethers.constants.Zero)

      // accumulate 1 day and claim, notify 93k
      await advanceTimeAndBlock(86400) // epoch+1d
      await mw.connect(users[0]).multiClaim([0])
      expect(await wom.balanceOf(users[0].address)).near(parseEther('13333')) // 93k / 7

      await advanceTimeAndBlock(86400) // epoch+2d

      // pause
      await voter.pauseVoteEmission(lpToken1.address)

      // pass 5 day; wait for the next epoch start
      // update reward rate before claiming
      await advanceTimeAndBlock(86400 * 5) // epoch+7d
      let receipt = mw.connect(users[0]).multiClaim([0, 1, 2])
      await expect(receipt).to.emit(voter, 'DistributeReward')
      expect(await wom.balanceOf(users[0].address)).near(parseEther('93333')) // 93k

      // claim 1/7 of rewards current epoch
      await advanceTimeAndBlock(86400) // epoch+8d
      await mw.connect(users[0]).multiClaim([0])
      expect(await wom.balanceOf(users[0].address)).near(parseEther('97143')) // 93k + 93k / 7 / 3

      // vote to update `supplyIndex`
      await advanceTimeAndBlock(86400) // epoch+9d
      await mw.connect(users[0]).multiClaim([0, 1, 2])
      expect(await wom.balanceOf(users[0].address)).near(parseEther('100952'))

      // resume
      await voter.resumeVoteEmission(lpToken1.address)

      // wait for the next epoch start; notify 93k * 5/7 = 66.4k
      await advanceTimeAndBlock(86400 * 5) // epoch+14d
      receipt = mw.connect(users[0]).multiClaim([0, 1, 2])
      await expect(receipt).to.emit(voter, 'DistributeReward')
      expect(await wom.balanceOf(users[0].address)).near(parseEther('120000'))

      await mw.connect(users[0]).multiClaim([0])

      await advanceTimeAndBlock(86400) // epoch+15d
      await mw.connect(users[0]).multiClaim([0])
      expect(await wom.balanceOf(users[0].address)).near(parseEther('129500'))

      await advanceTimeAndBlock(86400 * 6) // epoch+21d
      await mw.connect(users[0]).multiClaim([0])
      expect(await wom.balanceOf(users[0].address)).near(parseEther('186600'))
    })

    it('can resume an paused & existing pool', async function () {
      await voter.add(mw.address, lpToken1.address, AddressZero)

      // not paused
      await expect(voter.resumeVoteEmission(lpToken1.address)).to.be.revertedWith('voter: not paused')

      // try to resume
      await voter.pauseVoteEmission(lpToken1.address)
      await voter.resumeVoteEmission(lpToken1.address)

      // cannot resume a non-exsiting pool
      await expect(voter.resumeVoteEmission(lpToken2.address)).to.be.revertedWith('Voter: gaugeManager not exist')
    })

    it('resume rewards should be distributed', async function () {
      // prepare
      await mw.add(lpToken1.address, AddressZero)
      await mw.add(lpToken2.address, AddressZero)
      await mw.add(lpToken3.address, AddressZero)

      await voter.add(mw.address, lpToken1.address, AddressZero)
      await voter.add(mw.address, lpToken2.address, AddressZero)
      await voter.add(mw.address, lpToken3.address, AddressZero)

      await lpToken1.transfer(users[0].address, parseUnits('100000'))
      await lpToken1.connect(users[0]).approve(mw.address, parseEther('1000000000'))

      // vote & deposit
      await voter
        .connect(users[0])
        .vote(
          [lpToken1.address, lpToken2.address, lpToken3.address],
          [parseEther('10'), parseEther('20'), parseEther('30')]
        )
      await mw.connect(users[0]).deposit(0, parseUnits('1'))

      // pause
      // un-distributed rewards should be forfeited
      await advanceTimeAndBlock(6000)
      await voter.pauseVoteEmission(lpToken1.address)

      // wait for the next epoch start
      await advanceTimeAndBlock(86400 * 7)
      await mw.multiClaim([0, 1, 2])

      // resume
      await advanceTimeAndBlock(6000)
      await mw.multiClaim([0])

      // wait for the next epoch start
      await advanceTimeAndBlock(86400 * 7)
      await mw.multiClaim([0, 1, 2])

      // claim
      await advanceTimeAndBlock(6000)
      await mw.connect(users[0]).multiClaim([0])
      expect(await wom.balanceOf(users[0].address)).near(parseEther('926.23'))
    })

    it('non-whitelisted gauge should receive base reward', async function () {
      // 60% base rewards
      await voter.setBaseAllocation(600)

      // prepare
      await mw.add(lpToken1.address, AddressZero)
      await mw.add(lpToken2.address, AddressZero)
      await mw.add(lpToken3.address, AddressZero)

      await voter.add(mw.address, lpToken1.address, AddressZero)
      await voter.add(mw.address, lpToken2.address, AddressZero)
      await voter.add(mw.address, lpToken3.address, AddressZero)

      // approvals
      await lpToken1.transfer(users[0].address, parseUnits('100000'))
      await lpToken2.transfer(users[0].address, parseUnits('100000'))
      await lpToken3.transfer(users[0].address, parseEther('100000'))

      await lpToken1.transfer(users[1].address, parseUnits('100000'))
      await lpToken2.transfer(users[1].address, parseUnits('100000'))
      await lpToken3.transfer(users[1].address, parseEther('100000'))

      await lpToken1.connect(users[0]).approve(mw.address, parseEther('1000000000'))
      await lpToken2.connect(users[0]).approve(mw.address, parseEther('1000000000'))
      await lpToken3.connect(users[0]).approve(mw.address, parseEther('1000000000'))

      await lpToken1.connect(users[1]).approve(mw.address, parseEther('1000000000'))
      await lpToken2.connect(users[1]).approve(mw.address, parseEther('1000000000'))
      await lpToken3.connect(users[1]).approve(mw.address, parseEther('1000000000'))

      await voter.setAllocPoint(lpToken1.address, parseEther('1'))
      await voter.setAllocPoint(lpToken2.address, parseEther('2'))
      await voter.setAllocPoint(lpToken3.address, parseEther('3'))
      await voter.pauseVoteEmission(lpToken1.address)

      await advanceTimeAndBlock(86400 * 4)

      expect(await voter.pendingWom(lpToken1.address)).roughlyNear(parseEther('32000'))
      expect(await voter.pendingWom(lpToken2.address)).roughlyNear(parseEther('64000'))
      expect(await voter.pendingWom(lpToken3.address)).roughlyNear(parseEther('96000'))

      await voter.connect(users[0]).vote([lpToken1.address, lpToken2.address], [parseEther('200'), parseEther('100')])

      await mw.connect(users[0]).deposit(0, parseUnits('0.0001'))
      await mw.connect(users[0]).deposit(1, parseUnits('1'))
      await mw.connect(users[0]).deposit(2, parseEther('10000'))

      // wait for the next epoch start
      await advanceTimeAndBlock(86400 * 3)

      // should have been accumulated for 1 week
      // 120k, 92k
      expect(await voter.pendingWom(lpToken1.address)).near(parseEther('56000')) // 560000 * (0.6 * 1/6 + 0.4 * 3/7 * 200/300 * 0)
      expect(await voter.pendingWom(lpToken2.address)).near(parseEther('144000')) // 560000 * (0.6 * 2/6 + 0.4 * 3/7 * 100/300)
      expect(await voter.pendingWom(lpToken3.address)).near(parseEther('168000')) // 560000 * 0.6 * 3/6

      // trigger Voter.distribute
      const receipt1 = mw.connect(users[0]).multiClaim([0, 1, 2])
      await expect(receipt1).to.emit(voter, 'DistributeReward')

      expect((await mw.pendingTokens(0, users[0].address)).pendingRewards).eq(0)

      // claim reward
      await advanceTimeAndBlock(600)

      expect((await mw.pendingTokens(0, users[0].address)).pendingRewards).near(parseEther('55.55'))
      const balance1: BigNumber = await wom.balanceOf(users[0].address)
      await mw.connect(users[0]).multiClaim([0])
      const balance2: BigNumber = await wom.balanceOf(users[0].address)
      expect(balance2.sub(balance1)).roughlyNear(parseEther('55.5'))

      expect((await mw.pendingTokens(1, users[0].address)).pendingRewards).near(parseEther('143.0'))
      await mw.connect(users[0]).multiClaim([1])
      const balance3 = await wom.balanceOf(users[0].address)
      expect(balance3.sub(balance2)).roughlyNear(parseEther('143'))

      expect((await mw.pendingTokens(2, users[0].address)).pendingRewards).near(parseEther('167.2'))
      await mw.connect(users[0]).multiClaim([2])
      const balance4 = await wom.balanceOf(users[0].address)
      expect(balance4.sub(balance3)).roughlyNear(parseEther('167'))
    })
  })

  describe('Bribe', async function () {
    beforeEach(async function () {
      // prepare bribe
      bribeToken = await MockERC20.deploy('Partner Token', 'PARTNER', 18, parseEther('1000000'))
      const startTime = (await latest()).add(10)
      bribe = await Bribe.deploy(voter.address, lpToken1.address, startTime, bribeToken.address, partnerRewardPerSec)
      await bribeToken.transfer(bribe.address, parseEther('1000000'))

      // prepare mw
      await mw.add(lpToken1.address, AddressZero)
      await voter.add(mw.address, lpToken1.address, bribe.address)

      // approvals
      await lpToken1.transfer(users[0].address, parseUnits('100000'))
      await lpToken1.transfer(users[1].address, parseUnits('100000'))
      await lpToken1.connect(users[0]).approve(mw.address, parseEther('1000000000'))
      await lpToken1.connect(users[1]).approve(mw.address, parseEther('1000000000'))
    })

    it('claim bribe tokens', async function () {
      await voter.connect(users[0]).vote([lpToken1.address], [parseEther('10')])
      await voter.connect(users[1]).vote([lpToken1.address, lpToken1.address], [parseEther('20'), parseEther('30')])

      // claim rewards
      await advanceTimeAndBlock(6000)
      expect((await voter.pendingBribes([lpToken1.address], users[0].address)).bribeRewards[0][0]).roughlyNear(
        parseEther('380.7')
      )
      expect((await voter.pendingBribes([lpToken1.address], users[1].address)).bribeRewards[0][0]).roughlyNear(
        parseEther('1903')
      )
      await voter.connect(users[0]).claimBribes([lpToken1.address])
      await voter.connect(users[1]).claimBribes([lpToken1.address])

      expect(await bribeToken.balanceOf(users[0].address)).to.near(parseEther('380.7'))
      expect(await bribeToken.balanceOf(users[1].address)).to.near(parseEther('1903'))

      // unvote half and claim rewards again
      await voter.connect(users[0]).vote([lpToken1.address], [parseEther('-5')])
      await advanceTimeAndBlock(6000)
      expect((await voter.pendingBribes([lpToken1.address], users[0].address)).bribeRewards[0][0]).near(
        parseEther('207.5')
      )
      expect((await voter.pendingBribes([lpToken1.address], users[1].address)).bribeRewards[0][0]).near(
        parseEther('2075.9')
      )
      await voter.connect(users[0]).claimBribes([lpToken1.address])
      await voter.connect(users[1]).claimBribes([lpToken1.address])

      expect(await bribeToken.balanceOf(users[0].address)).to.near(parseEther('588.6'))
      expect(await bribeToken.balanceOf(users[1].address)).to.near(parseEther('3980'))
    })

    it('claim multiple bribe tokens', async function () {
      const bribeToken2 = await MockERC20.deploy('Partner Token 2', 'PARTNER', 18, parseEther('1000000'))
      await bribeToken2.transfer(bribe.address, parseEther('1000000'))
      await bribe.addRewardToken(bribeToken2.address, parseEther('1.23'))
      await voter.connect(users[0]).vote([lpToken1.address], [parseEther('10')])
      await advanceTimeAndBlock(6000)

      const pendingTokens = await bribe.pendingTokens(users[0].address)
      expect(pendingTokens[0]).roughlyNear(parseEther('2283'))
      expect(pendingTokens[1]).roughlyNear(parseEther('7381'))
      expect(await bribe.rewardTokens()).to.eql([bribeToken.address, bribeToken2.address])

      const pendingBribes = await voter.pendingBribes([lpToken1.address], users[0].address)
      expect(pendingBribes.bribeRewards.length).to.eql(1)
      expect(pendingBribes.bribeRewards[0]).to.eql(pendingTokens)
      await voter.connect(users[0]).claimBribes([lpToken1.address])
      expect(await bribeToken.balanceOf(users[0].address)).to.near(pendingTokens[0])
      expect(await bribeToken2.balanceOf(users[0].address)).to.near(pendingTokens[1])
    })

    it('pendingBribes', async function () {
      const bribeToken2 = await MockERC20.deploy('Partner Token 2', 'PARTNER', 18, parseEther('1000000'))
      await bribeToken2.transfer(bribe.address, parseEther('1000000'))
      await owner.sendTransaction({ value: parseEther('10'), to: bribe.address })
      await bribe.addRewardToken(bribeToken2.address, parseEther('1.23'))
      await bribe.addRewardToken(AddressZero, parseEther('2'))
      await voter.connect(users[0]).vote([lpToken1.address], [parseEther('10')])
      await advanceTimeAndBlock(6000)

      const pendingTokens = await bribe.pendingTokens(users[0].address)
      expect(pendingTokens[0]).roughlyNear(parseEther('2283'))
      expect(pendingTokens[1]).roughlyNear(parseEther('7381'))
      expect(pendingTokens[2]).roughlyNear(parseEther('12008'))
      expect(await bribe.rewardTokens()).to.eql([bribeToken.address, bribeToken2.address, AddressZero])

      const pendingBribes = await voter.pendingBribes([lpToken1.address], users[0].address)
      expect(pendingBribes.bribeRewards.length).to.eql(1)
      expect(pendingBribes.bribeRewards[0]).to.eql(pendingTokens)
      expect(pendingBribes.bribeTokenAddresses[0]).to.eql([bribeToken.address, bribeToken2.address, AddressZero])
      expect(pendingBribes.bribeTokenSymbols[0]).to.eql(['PARTNER', 'PARTNER', 'BNB'])
    })

    it('vote/unvote should claim bribe tokens and change emission rate', async function () {
      await voter.connect(users[0]).vote([lpToken1.address], [parseEther('10')])
      await voter.connect(users[1]).vote([lpToken1.address, lpToken1.address], [parseEther('20'), parseEther('30')])

      // vote/unvote claim rewards
      await advanceTimeAndBlock(6000)
      await voter.connect(users[0]).vote([lpToken1.address], [parseEther('-9')])
      await voter.connect(users[1]).vote([lpToken1.address], [parseEther('50')])

      expect(await bribeToken.balanceOf(users[0].address)).to.near(parseEther('380.7'))
      expect(await bribeToken.balanceOf(users[1].address)).to.near(parseEther('1903'))

      // claim rewards
      await advanceTimeAndBlock(6000)
      expect((await voter.pendingBribes([lpToken1.address], users[0].address)).bribeRewards[0][0]).roughlyNear(
        parseEther('22.62')
      )
      expect((await voter.pendingBribes([lpToken1.address], users[1].address)).bribeRewards[0][0]).roughlyNear(
        parseEther('2261')
      )
      const balance1 = await bribeToken.balanceOf(users[0].address)
      const balance2 = await bribeToken.balanceOf(users[1].address)
      await voter.connect(users[0]).claimBribes([lpToken1.address])
      await voter.connect(users[1]).claimBribes([lpToken1.address])

      const balance3 = await bribeToken.balanceOf(users[0].address)
      const balance4 = await bribeToken.balanceOf(users[1].address)
      expect(balance3.sub(balance1)).to.near(parseEther('22.62'))
      expect(balance4.sub(balance2)).to.near(parseEther('2261'))
    })

    it('operator role', async function () {
      // configure operator
      await bribe.setOperator(users[1].address)

      // operator configures the contract
      await bribe.connect(users[1]).setRewardRate(0, 100)

      // renounce ownership
      await bribe.setOperator(AddressZero)

      await expect(bribe.connect(users[1]).setRewardRate(0, 100)).to.be.revertedWith('onlyOperatorOrOwner')
    })
  })
})
