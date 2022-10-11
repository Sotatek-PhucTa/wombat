import { ethers, network } from 'hardhat'
import chai from 'chai'
import { expect } from 'chai'
import { advanceTimeAndBlock, latest, sqrt } from './helpers'
import { formatEther, parseEther, parseUnits } from '@ethersproject/units'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { AddressZero } from '@ethersproject/constants'
import { solidity } from 'ethereum-waffle'
import { near } from './assertions/near'
import { BigNumberish } from '@ethersproject/bignumber'
import { roughlyNear } from './assertions/roughlyNear'

chai.use(solidity)
chai.use(near)
chai.use(roughlyNear)

describe('MasterWombat V2', function () {
  let owner: SignerWithAddress
  let users: SignerWithAddress[]

  before(async function () {
    ;[owner, ...users] = await ethers.getSigners()

    this.MasterWombat = await ethers.getContractFactory('MasterWombatV2')
    this.Wom = await ethers.getContractFactory('WombatERC20')
    this.MockERC20 = await ethers.getContractFactory('MockERC20')
  })

  beforeEach(async function () {
    this.lastBlock = await ethers.provider.getBlock('latest')
    this.wom = await this.Wom.connect(owner).deploy(owner.address, parseUnits('1000000', 18)) // 1 mil WOM
    this.womPerSec = parseEther('1000000').mul(8).div(10).div(365).div(24).div(3600)
    await this.wom.deployed()

    // deploy mock token - 18 d.p
    this.mockERC20 = await this.MockERC20.connect(owner).deploy('mock', 'MOCK', 18, parseEther('100')) // b=2
    await this.mockERC20.deployed()

    // vewom - 18 d.p
    this.vewom = await this.MockERC20.connect(owner).deploy('vewom', 'vewom', 18, parseEther('100')) // b=2
    await this.vewom.deployed()

    // deploy dommy token - 6 d.p.
    this.dummyToken = await this.MockERC20.connect(owner).deploy('Dummy', 'DUMMY', 6, parseUnits('100', 6)) // b=2
    await this.dummyToken.deployed()
  })

  describe('Master Wombat Utils', function () {
    beforeEach(async function () {
      // We make start time 60 seconds past the last block
      const startTime = (await latest()).add(60)

      // deploy master wombat
      this.mw = await this.MasterWombat.connect(owner).deploy()
      await this.mw.deployed()

      await this.mw.connect(owner).initialize(
        this.wom.address,
        this.dummyToken.address,
        this.womPerSec,
        1000, // 100% base
        startTime
      )

      // transfer 80% of wom supply to master wombat contract
      const supply = (await this.wom.totalSupply()).mul(8).div(10)
      await this.wom.connect(owner).transfer(this.mw.address, supply)
      expect(await this.wom.balanceOf(this.mw.address)).to.be.equal(supply)

      this.lp = await this.MockERC20.deploy('LPToken', 'LP', 18, parseEther('10000000000'))
      await this.lp.deployed()
      await this.lp.transfer(owner.address, parseEther('1000'))
      await this.lp.transfer(users[1].address, parseEther('1000'))
      await this.lp.transfer(users[2].address, parseEther('1000'))

      this.lp2 = await this.MockERC20.deploy('LPToken2', 'LP2', 6, parseUnits('10000000000', 6))
      await this.lp2.deployed()
      await this.lp2.transfer(owner.address, parseUnits('1000', 6))
      await this.lp2.transfer(users[1].address, parseUnits('1000', 6))
      await this.lp2.transfer(users[2].address, parseUnits('1000', 6))
    })

    it('should pause and unpause', async function () {
      // Pause pool : expect to emit event and for state pause event to change
      const receipt1 = await this.mw.connect(owner).pause()
      expect(await this.mw.paused()).to.equal(true)
      await expect(receipt1).to.emit(this.mw, 'Paused').withArgs(owner.address)

      // Unpause pool : expect emit event and state change
      const receipt2 = await this.mw.connect(owner).unpause()
      expect(await this.mw.paused()).to.equal(false)

      await expect(receipt2).to.emit(this.mw, 'Unpaused').withArgs(owner.address)

      // restricts to owner
      await expect(this.mw.connect(users[0]).pause()).to.be.revertedWith('Ownable: caller is not the owner')
      await expect(this.mw.connect(users[0]).unpause()).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('withdraw full wom balance on emergencyWithdraw', async function () {
      const womTotalSupply = await this.wom.totalSupply()
      const amount = parseInt(formatEther(womTotalSupply)) * 0.8
      const amountInWei = parseEther(amount.toString())

      expect(await this.wom.balanceOf(this.mw.address)).to.be.equal(amountInWei)

      // Should revert if called by not owner
      await expect(this.mw.connect(users[1]).emergencyWomWithdraw()).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )

      // Emergency withdraw
      const before = await this.wom.balanceOf(owner.address)
      await this.mw.connect(owner).emergencyWomWithdraw()
      const after = await this.wom.balanceOf(owner.address)

      expect(after.sub(before)).to.be.equal(amountInWei)
    })

    it('only vewom can call updateFactor', async function () {
      await expect(this.mw.updateFactor(users[1].address, parseEther('10'))).to.be.revertedWith(
        'MasterWombat: caller is not VeWom'
      )
      await expect(this.mw.updateFactor(owner.address, parseEther('10'))).to.be.revertedWith(
        'MasterWombat: caller is not VeWom'
      )

      await this.mw.setVeWom(owner.address)
      await expect(this.mw.updateFactor(users[1].address, parseEther('10'))).to.be.ok
    })

    it('should set womPerSec correctly', async function () {
      // add lp to master and deposit
      await this.mw.connect(owner).add('100', this.lp.address, AddressZero)
      await this.lp.connect(owner).approve(this.mw.address, ethers.constants.MaxUint256)
      await this.mw.connect(owner).deposit(0, parseEther('100'))
      expect(await this.mw.womPerSec()).to.equal(this.womPerSec)

      // add lp2. it shouldnt affect wom per sec
      await this.mw.add('900', this.lp2.address, AddressZero)
      expect(await this.mw.womPerSec()).to.equal(this.womPerSec)
      expect(await this.mw.totalAllocPoint()).to.be.equal(1000)
    })

    it('should revert if the same lpToken is added into the pool', async function () {
      await this.mw.add('100', this.lp.address, AddressZero)

      await expect(this.mw.add('100', this.lp.address, AddressZero)).to.be.revertedWith('add: LP already added')
    })

    it('should set correct state variables womPerSec, vewom and emission partition', async function () {
      // update emission rate
      const receipt = await this.mw.updateEmissionRate(777)
      expect(await this.mw.wom()).to.equal(this.wom.address)
      expect(await this.mw.womPerSec()).to.be.equal(777)

      expect(receipt).to.emit(this.mw, 'UpdateEmissionRate').withArgs(owner.address, 777)

      // update vewom
      expect(await this.mw.veWom()).to.be.equal(this.dummyToken.address)
      const receipt1 = await this.mw.setVeWom(this.lp2.address)
      expect(await this.mw.veWom()).to.be.equal(this.lp2.address)

      expect(receipt1)
        .to.emit(this.mw, 'UpdateVeWOM')
        .withArgs(owner.address, this.dummyToken.address, this.lp2.address)

      // update emissions partition
      expect(await this.mw.basePartition()).to.be.equal(1000)
      expect(await this.mw.boostedPartition()).to.be.equal(0)
      const receipt2 = await this.mw.updateEmissionPartition(500)
      expect(await this.mw.basePartition()).to.be.equal(500)
      expect(await this.mw.boostedPartition()).to.be.equal(500)

      expect(receipt2).to.emit(this.mw, 'UpdateEmissionPartition').withArgs(owner.address, 500, 500)
    })

    it('should check rewarder added and set properly', async function () {
      // Try to add rewarder that is neither zero address or contract address
      await expect(this.mw.add('100', this.lp.address, users[1].address)).to.be.revertedWith(
        'add: rewarder must be contract or zero'
      )

      await this.mw.add('100', this.lp.address, this.dummyToken.address)

      // Try to set rewarder that is neither zero address or contract address
      await expect(this.mw.set('0', '200', users[1].address, true)).to.be.revertedWith(
        'set: rewarder must be contract or zero'
      )

      await this.mw.set('0', '200', this.dummyToken.address, false)
      expect((await this.mw.poolInfo(0)).allocPoint).to.equal('200')
    })

    it('should allow emergency withdraw from MasterWombat', async function () {
      await this.mw.add('100', this.lp.address, AddressZero)

      await this.lp.connect(users[1]).approve(this.mw.address, parseEther('1000'))

      await this.mw.connect(users[1]).deposit(0, parseEther('100'))

      expect(await this.lp.balanceOf(users[1].address)).to.equal(parseEther('900'))

      await this.mw.connect(users[1]).emergencyWithdraw(0)

      expect(await this.lp.balanceOf(users[1].address)).to.equal(parseEther('1000'))
    })

    it('should give out woms only after farming time', async function () {
      // add lp to master wombat
      await this.mw.add('100', this.lp.address, ethers.constants.AddressZero)
      expect(await this.lp.balanceOf(users[1].address)).to.be.equal(parseEther('1000'))

      // approve spending by master and deposit 100 lp
      await this.lp.connect(users[1]).approve(this.mw.address, parseEther('1000'))
      await this.mw.connect(users[1]).deposit(0, parseEther('100'))
      expect(await this.lp.balanceOf(users[1].address)).to.be.equal(parseEther('900'))

      // print reward start time, it is before rewards start
      // console.log(`Master rewards start timestamp : ${await this.mw.startTimestamp()}`)
      // console.log(`Current timestamp 1: ${(await latest()).toNumber()}`)
      expect((await latest()).toNumber() < (await this.mw.startTimestamp()))

      // try to claim
      await this.mw.connect(users[1]).deposit(0, '0')
      expect(await this.wom.balanceOf(users[1].address)).to.equal('0')

      // advance time
      await advanceTimeAndBlock(100)
      // console.log(`Current timestamp 2: ${(await latest()).toNumber()}`)

      // claim again, it should give users[1] wom
      await this.mw.connect(users[1]).deposit(0, '0')
      expect(await this.wom.balanceOf(users[1].address)).to.be.above(parseEther('0.14205986808'))
      expect(await this.wom.balanceOf(users[1].address)).to.be.below(parseEther('53'))

      // console.log(`Users[1] balance = ${await this.wom.balanceOf(users[1].address)}`)

      await advanceTimeAndBlock(10000)
      // console.log(`Current timestamp 3: ${(await latest()).toNumber()}`)

      await this.mw.connect(users[1]).deposit(0, '0')

      expect(await this.wom.balanceOf(users[1].address)).to.be.near(parseEther('255.1243023845'))
    })

    it('should not distribute woms if no one deposit', async function () {
      const womTotalSupply = await this.wom.totalSupply()
      await this.mw.add('100', this.lp.address, ethers.constants.AddressZero) // t-55
      await this.lp.connect(users[1]).approve(this.mw.address, parseEther('1000')) // t-54
      await advanceTimeAndBlock(100) // t+54

      expect(await this.wom.balanceOf(this.mw.address)).to.be.equal(parseEther('800000'))
      await advanceTimeAndBlock(5) // t+59
      expect(await this.wom.balanceOf(this.mw.address)).to.be.equal(parseEther('800000'))
      await advanceTimeAndBlock(5) // t+64
      await this.mw.connect(users[1]).deposit(0, parseEther('1000')) // t+65
      expect(await this.wom.balanceOf(this.mw.address)).to.be.equal(parseEther('800000'))
      expect(await this.wom.balanceOf(users[1].address)).to.equal('0')
      expect(await this.lp.balanceOf(users[1].address)).to.equal('0')
      await advanceTimeAndBlock(10) // t+75
      // Revert if users[1] withdraws more than he deposited
      await expect(this.mw.connect(users[1]).withdraw(0, parseEther('1001'))).to.be.revertedWith('withdraw: not good') // t+76
      const [pendingTokens] = await this.mw.connect(users[1]).pendingTokens(0, users[1].address)
      await this.mw.connect(users[1]).withdraw(0, parseEther('1000')) // t+77

      // At this point:
      //   - Total supply is unchanged
      // user should have gather some wom
      expect(await this.wom.totalSupply()).to.be.equal(womTotalSupply)
      // a few secs passed and this is enough for us to have some differences
      expect(pendingTokens).to.be.roughlyNear(parseEther('0.304414003'))
      expect(await this.wom.balanceOf(users[1].address)).to.be.roughlyNear(parseEther('0.304414003'))
    })
  })

  describe('[USDC Pool] Base pool only', function () {
    beforeEach(async function () {
      // We make start time 60 seconds past the last block
      const startTime = (await latest()).add(60)
      const MockVeWom = await ethers.getContractFactory('MockVeWom')
      this.mockVeWom = await MockVeWom.connect(owner).deploy()
      this.mockVeWom.deployed()

      // deploy master wombat
      this.mw = await this.MasterWombat.connect(owner).deploy()
      await this.mw.deployed()

      await this.mw.connect(owner).initialize(
        this.wom.address,
        this.mockVeWom.address,
        this.womPerSec,
        1000, // 100% base
        startTime
      )

      await this.mockVeWom.initialize(this.wom.address, this.mw.address)

      // transfer 80% of wom supply to master wombat contract
      const supply = (await this.wom.totalSupply()).mul(8).div(10)
      await this.wom.connect(owner).transfer(this.mw.address, supply)
      expect(await this.wom.balanceOf(this.mw.address)).to.be.equal(supply)

      // deploy usdc and the other tokens
      this.usdc = await this.MockERC20.deploy('USDC', 'LP-USDC', 6, parseUnits('10000000000', 6))
      await this.usdc.deployed()

      this.usdt = await this.MockERC20.deploy('USDT', 'LP-USDT', 6, parseUnits('10000000000', 6))
      await this.usdt.deployed()

      this.mim = await this.MockERC20.deploy('MIM', 'LP-MIM', 18, parseEther('10000000000')) // 10 b
      await this.mim.deployed()

      this.dai = await this.MockERC20.deploy('DAI', 'LP-DAI', 18, parseEther('10000000000')) // 10 b
      await this.dai.deployed()

      // credit users with usdc
      await this.usdc.transfer(users[1].address, parseUnits('60000', 6))
      await this.usdc.transfer(users[2].address, parseUnits('90000', 6))
      await this.usdc.transfer(users[3].address, parseUnits('350000', 6))
      await this.usdc.transfer(users[4].address, parseUnits('1500000', 6))
      await this.usdc.transfer(users[5].address, parseUnits('18000000', 6))
      await this.usdc.transfer(users[6].address, parseUnits('30000000', 6))

      // credit users with mockVeWom
      await this.mockVeWom.connect(users[1]).faucet(parseEther('22000'))
      // await this.mockVeWom.connect(users[2]).faucet(parseEther('0')) // users[2] has no vewom.
      await this.mockVeWom.connect(users[3]).faucet(parseEther('3000'))
      await this.mockVeWom.connect(users[4]).faucet(parseEther('128000'))
      await this.mockVeWom.connect(users[5]).faucet(parseEther('5129300'))
      await this.mockVeWom.connect(users[6]).faucet(parseEther('16584200'))

      // approve spending by pool
      await this.usdc.connect(users[1]).approve(this.mw.address, parseUnits('60000', 6))
      await this.usdc.connect(users[2]).approve(this.mw.address, parseUnits('90000', 6))
      await this.usdc.connect(users[3]).approve(this.mw.address, parseUnits('350000', 6))
      await this.usdc.connect(users[4]).approve(this.mw.address, parseUnits('1500000', 6))
      await this.usdc.connect(users[5]).approve(this.mw.address, parseUnits('18000000', 6))
      await this.usdc.connect(users[6]).approve(this.mw.address, parseUnits('30000000', 6))

      /// other tokens
      await this.usdt.transfer(users[7].address, parseUnits('50000000', 6))
      await this.usdt.connect(users[7]).approve(this.mw.address, parseUnits('50000000', 6))

      await this.dai.transfer(users[8].address, parseEther('40000000'))
      await this.dai.connect(users[8]).approve(this.mw.address, parseUnits('40000000', 18))

      await this.mim.transfer(users[9].address, parseEther('20000000'))
      await this.mim.connect(users[9]).approve(this.mw.address, parseUnits('20000000', 18))

      // add lp-tokens to the wombat master with correct weighing
      await this.mw.add('30', this.usdt.address, ethers.constants.AddressZero)
      await this.mw.add('30', this.usdc.address, ethers.constants.AddressZero)
      await this.mw.add('25', this.dai.address, ethers.constants.AddressZero)
      await this.mw.add('15', this.mim.address, ethers.constants.AddressZero)
      expect(await this.mw.totalAllocPoint()).to.be.equal(100)
      expect(await this.mw.basePartition()).to.be.equal(1000)
      expect(await this.mw.boostedPartition()).to.be.equal(0)
    })

    it('should claim wom when withdraw', async function () {
      await advanceTimeAndBlock(60 * 60 * 24 * 365) // advance one year
      expect(await this.wom.balanceOf(users[1].address)).to.be.eq(0)
      await this.mw.connect(users[1]).deposit(1, parseUnits('60000', 6))
      await this.mw.connect(users[1]).withdraw(1, parseUnits('60000', 6))
      expect(await this.wom.balanceOf(users[1].address)).to.be.gt(0)
    })
  })

  describe('[USDC Pool] boosted pool only', function () {
    beforeEach(async function () {
      // We make start time 60 seconds past the last block
      const startTime = (await latest()).add(60)

      const boostedPerSec = parseEther('0.5707762557077626')

      const MockVeWom = await ethers.getContractFactory('MockVeWom')
      this.mockVeWom = await MockVeWom.deploy()
      this.mockVeWom.deployed()

      // deploy master wombat
      this.mw = await this.MasterWombat.deploy()
      await this.mw.deployed()

      await this.mw.initialize(
        this.wom.address,
        this.mockVeWom.address,
        boostedPerSec,
        0, // 100% boosted
        startTime
      )

      this.mockVeWom.initialize(this.wom.address, this.mw.address)

      const supply = (await this.wom.totalSupply()).mul(8).div(10)
      await this.wom.connect(owner).transfer(this.mw.address, supply)
      expect(await this.wom.balanceOf(this.mw.address)).to.be.equal(supply)

      // deploy usdc and the other tokens
      this.usdc = await this.MockERC20.deploy('USDC', 'LP-USDC', 6, parseUnits('10000000000', 6))
      await this.usdc.deployed()

      this.usdt = await this.MockERC20.deploy('USDT', 'LP-USDT', 6, parseUnits('10000000000', 6))
      await this.usdt.deployed()

      this.mim = await this.MockERC20.deploy('MIM', 'LP-MIM', 18, parseEther('10000000000')) // 10 b
      await this.mim.deployed()

      this.dai = await this.MockERC20.deploy('DAI', 'LP-DAI', 18, parseEther('10000000000')) // 10 b
      await this.dai.deployed()

      // credit users with usdc
      await this.usdc.transfer(users[1].address, parseUnits('60000', 6))
      await this.usdc.transfer(users[2].address, parseUnits('90000', 6))
      await this.usdc.transfer(users[3].address, parseUnits('350000', 6))
      await this.usdc.transfer(users[4].address, parseUnits('1500000', 6))
      await this.usdc.transfer(users[5].address, parseUnits('18000000', 6))
      await this.usdc.transfer(users[6].address, parseUnits('30000000', 6))

      // credit users with mockVeWom
      await this.mockVeWom.connect(users[1]).faucet(parseEther('22000'))
      // await this.mockVeWom.connect(users[2]).faucet(parseEther('0')) // users[2] has no vewom.
      await this.mockVeWom.connect(users[3]).faucet(parseEther('3000'))
      await this.mockVeWom.connect(users[4]).faucet(parseEther('128000'))
      await this.mockVeWom.connect(users[5]).faucet(parseEther('5129300'))
      await this.mockVeWom.connect(users[6]).faucet(parseEther('16584200'))

      // approve spending by pool
      await this.usdc.connect(users[1]).approve(this.mw.address, parseUnits('60000', 6))
      await this.usdc.connect(users[2]).approve(this.mw.address, parseUnits('90000', 6))
      await this.usdc.connect(users[3]).approve(this.mw.address, parseUnits('350000', 6))
      await this.usdc.connect(users[4]).approve(this.mw.address, parseUnits('1500000', 6))
      await this.usdc.connect(users[5]).approve(this.mw.address, parseUnits('18000000', 6))
      await this.usdc.connect(users[6]).approve(this.mw.address, parseUnits('30000000', 6))

      // add lp-tokens to the wombat master with correct weighing
      await this.mw.add('30', this.usdt.address, ethers.constants.AddressZero)
      await this.mw.add('30', this.usdc.address, ethers.constants.AddressZero)
      await this.mw.add('25', this.dai.address, ethers.constants.AddressZero)
      await this.mw.add('15', this.mim.address, ethers.constants.AddressZero)
      expect(await this.mw.totalAllocPoint()).to.be.equal(100)
    })

    it('should claim wom when withdraw', async function () {
      await this.mw.connect(users[1]).deposit(1, parseUnits('60000', 6)) // usdt
      await advanceTimeAndBlock(60 * 60 * 24 * 365) // advance one year
      expect(await this.wom.balanceOf(users[1].address)).to.be.eq(0)
      await this.mw.connect(users[1]).withdraw(1, parseUnits('60000', 6))
      expect(await this.wom.balanceOf(users[1].address)).to.be.gt(0)
    })
  })

  describe('[All pools] Base pool only', function () {
    beforeEach(async function () {
      // We make start time 60 seconds past the last block
      const startTime = (await latest()).add(60)
      // deploy master wombat
      this.mw = await this.MasterWombat.deploy()
      await this.mw.deployed()

      await this.mw.initialize(
        this.wom.address,
        this.vewom.address,
        this.womPerSec,
        1000, // 100% boosted
        startTime
      )

      const supply = (await this.wom.totalSupply()).mul(8).div(10)
      await this.wom.connect(owner).transfer(this.mw.address, supply)
      expect(await this.wom.balanceOf(this.mw.address)).to.be.equal(supply)

      this.usdt = await this.MockERC20.deploy('USDT', 'LP-USDT', 6, parseUnits('10000000000', 6))
      await this.usdt.deployed()
      await this.usdt.transfer(users[1].address, parseUnits('50000000', 6))
      await this.usdt.transfer(users[2].address, parseUnits('50000000', 6))

      await this.usdt.connect(users[1]).approve(this.mw.address, parseUnits('50000000', 6))
      await this.usdt.connect(users[2]).approve(this.mw.address, parseUnits('50000000', 6))

      this.usdc = await this.MockERC20.deploy('USDC', 'LP-USDC', 6, parseUnits('10000000000', 6))
      await this.usdc.deployed()
      await this.usdc.transfer(users[1].address, parseUnits('50000000', 6))
      await this.usdc.transfer(users[2].address, parseUnits('50000000', 6))

      await this.usdc.connect(users[1]).approve(this.mw.address, parseUnits('50000000', 6))
      await this.usdc.connect(users[2]).approve(this.mw.address, parseUnits('50000000', 6))

      this.dai = await this.MockERC20.deploy('DAI', 'LP-DAI', 18, parseEther('10000000000')) // 10 b
      await this.dai.deployed()
      await this.dai.transfer(users[1].address, parseEther('40000000'))
      await this.dai.transfer(users[2].address, parseEther('40000000'))

      await this.dai.connect(users[1]).approve(this.mw.address, parseUnits('40000000', 18))
      await this.dai.connect(users[2]).approve(this.mw.address, parseUnits('40000000', 18))

      this.mim = await this.MockERC20.deploy('MIM', 'LP-MIM', 18, parseEther('10000000000')) // 10 b
      await this.mim.deployed()
      await this.mim.transfer(users[1].address, parseEther('20000000'))
      await this.mim.transfer(users[2].address, parseEther('20000000'))

      await this.mim.connect(users[1]).approve(this.mw.address, parseUnits('20000000', 18))
      await this.mim.connect(users[2]).approve(this.mw.address, parseUnits('20000000', 18))

      // add lp-tokens to the wombat master
      await this.mw.add('30', this.usdt.address, ethers.constants.AddressZero)
      await this.mw.add('30', this.usdc.address, ethers.constants.AddressZero)
      await this.mw.add('25', this.dai.address, ethers.constants.AddressZero)
      await this.mw.add('15', this.mim.address, ethers.constants.AddressZero)
      expect(await this.mw.totalAllocPoint()).to.be.equal(100)

      // deposit
      await this.mw.connect(users[1]).deposit(0, parseUnits('50000000', 6)) // usdt
      await this.mw.connect(users[1]).deposit(1, parseUnits('50000000', 6)) // usdc
      await this.mw.connect(users[1]).deposit(2, parseEther('40000000')) // dai
      await this.mw.connect(users[1]).deposit(3, parseEther('20000000')) // mim
    })

    it('should claim when withdraw', async function () {
      await advanceTimeAndBlock(60 * 60 * 24 * 365) // advance one year
      expect(await this.wom.balanceOf(users[1].address)).to.eq(0)
      await this.mw.connect(users[1]).withdraw(1, 0)
      expect(await this.wom.balanceOf(users[1].address)).to.gt(0)
    })

    it('should multiclaim from certain pools only', async function () {
      await advanceTimeAndBlock(60 * 60 * 24 * 365) // advance one year

      // Using a callStatic in order to get the returned value of a non view function
      const [womTotal, womAmounts, additionalRewards] = await this.mw.connect(users[1]).callStatic.multiClaim([0, 1])
      expect(womTotal).to.near(parseEther('479999.558599695582147300'))
      expect(womAmounts.length).to.eq(2)
      expect(additionalRewards.length).to.eq(2)

      // multiclaim pools 0 and 1
      await this.mw.connect(users[1]).multiClaim([0, 1])
      let womBalance = await this.wom.balanceOf(users[1].address)
      expect(womBalance).to.near(parseEther('479999.558599695582147300'))
      // console.log(womBalance)

      // multiclaim again, this time the other pools 3, 4
      await this.mw.connect(users[1]).multiClaim([2, 3])
      womBalance = await this.wom.balanceOf(users[1].address)
      expect(womBalance).to.near(parseEther('799999.299840395734354300'))
    })

    it('should multiclaim from one pool only', async function () {
      const pids = [3]
      await advanceTimeAndBlock(60 * 60 * 24 * 365) // advance one year
      const expectedYearlyRewards = parseEther('119999.89344')

      const [pending] = await this.mw.pendingTokens(3, users[1].address)

      // multiclaim
      await this.mw.connect(users[1]).multiClaim(pids)
      const womBalance = await this.wom.balanceOf(users[1].address)
      expect(womBalance).to.near(expectedYearlyRewards)
      expect(womBalance).to.near(pending)
      // console.log(womBalance)
    })

    it('should multiclaim from all pools', async function () {
      const pids = [0, 1, 2, 3]
      await advanceTimeAndBlock(60 * 60 * 24 * 365) // advance one year

      // multiclaim
      await this.mw.connect(users[1]).multiClaim(pids)
      expect(await this.wom.balanceOf(users[1].address)).to.near(parseEther('799999.289660395734354300'))

      // ROUND 2
      // let another year pass
      await advanceTimeAndBlock(60 * 60 * 24 * 365) // advance one year

      // multiclaim again
      await this.mw.connect(users[1]).multiClaim(pids)
      expect(await this.wom.balanceOf(users[1].address)).to.near(parseEther('800000'))
    })

    it('should claim when deposit', async function () {
      await advanceTimeAndBlock(60 * 60 * 24 * 365) // advance one year
      expect(await this.wom.balanceOf(users[1].address)).to.be.eq(0)
      await this.mw.connect(users[1]).deposit(0, 0)
      expect(await this.wom.balanceOf(users[1].address)).to.be.gt(0)
    })
  })

  describe('[All pools] Base + boosted pool', function () {
    beforeEach(async function () {
      // We make start time 60 seconds past the last block
      const startTime = (await latest()).add(60)
      const MockVeWom = await ethers.getContractFactory('MockVeWom')
      this.mockVeWom = await MockVeWom.deploy()
      this.mockVeWom.deployed()

      // deploy master wombat
      this.mw = await this.MasterWombat.deploy()
      await this.mw.deployed()

      await this.mw.initialize(
        this.wom.address,
        this.mockVeWom.address,
        this.womPerSec,
        375, // 37.5% base => corresponds to 30% / 50% (with 20 % allocated externally)
        startTime
      )

      await this.mockVeWom.initialize(this.wom.address, this.mw.address)

      const supply = (await this.wom.totalSupply()).mul(8).div(10)
      await this.wom.connect(owner).transfer(this.mw.address, supply)
      expect(await this.wom.balanceOf(this.mw.address)).to.be.equal(supply)

      // deploy usdc and the other tokens
      this.usdc = await this.MockERC20.deploy('USDC', 'LP-USDC', 6, parseUnits('10000000000', 6))
      await this.usdc.deployed()

      this.usdt = await this.MockERC20.deploy('USDT', 'LP-USDT', 6, parseUnits('10000000000', 6))
      await this.usdt.deployed()

      this.mim = await this.MockERC20.deploy('MIM', 'LP-MIM', 18, parseEther('10000000000')) // 10 b
      await this.mim.deployed()

      this.dai = await this.MockERC20.deploy('DAI', 'LP-DAI', 18, parseEther('10000000000')) // 10 b
      await this.dai.deployed()

      // credit users with usdc
      await this.usdc.transfer(users[1].address, parseUnits('60000', 6))
      await this.usdc.transfer(users[2].address, parseUnits('90000', 6))
      await this.usdc.transfer(users[3].address, parseUnits('350000', 6))
      await this.usdc.transfer(users[4].address, parseUnits('1500000', 6))
      await this.usdc.transfer(users[5].address, parseUnits('18000000', 6))
      await this.usdc.transfer(users[6].address, parseUnits('30000000', 6))

      // credit users with mockVeWom
      await this.mockVeWom.connect(users[1]).faucet(parseEther('22000'))
      // await this.mockVeWom.connect(users[2]).faucet(parseEther('0')) // users[2] has no vewom.
      await this.mockVeWom.connect(users[3]).faucet(parseEther('3000'))
      await this.mockVeWom.connect(users[4]).faucet(parseEther('128000'))
      await this.mockVeWom.connect(users[5]).faucet(parseEther('5129300'))
      await this.mockVeWom.connect(users[6]).faucet(parseEther('16584200'))

      // approve spending by pool
      await this.usdc.connect(users[1]).approve(this.mw.address, parseUnits('60000', 6))
      await this.usdc.connect(users[2]).approve(this.mw.address, parseUnits('90000', 6))
      await this.usdc.connect(users[3]).approve(this.mw.address, parseUnits('350000', 6))
      await this.usdc.connect(users[4]).approve(this.mw.address, parseUnits('1500000', 6))
      await this.usdc.connect(users[5]).approve(this.mw.address, parseUnits('18000000', 6))
      await this.usdc.connect(users[6]).approve(this.mw.address, parseUnits('30000000', 6))

      /// other tokens
      await this.usdt.transfer(users[7].address, parseUnits('50000000', 6))
      await this.usdt.connect(users[7]).approve(this.mw.address, parseUnits('50000000', 6))

      await this.dai.transfer(users[8].address, parseEther('40000000'))
      await this.dai.connect(users[8]).approve(this.mw.address, parseUnits('40000000', 18))

      await this.mim.transfer(users[9].address, parseEther('20000000'))
      await this.mim.connect(users[9]).approve(this.mw.address, parseUnits('20000000', 18))

      // add lp-tokens to the wombat master with correct weighing
      await this.mw.add('30', this.usdt.address, ethers.constants.AddressZero)
      await this.mw.add('30', this.usdc.address, ethers.constants.AddressZero)
      await this.mw.add('25', this.dai.address, ethers.constants.AddressZero)
      await this.mw.add('15', this.mim.address, ethers.constants.AddressZero)
      expect(await this.mw.totalAllocPoint()).to.be.equal(100)
      expect(await this.mw.basePartition()).to.be.equal(375)
      expect(await this.mw.boostedPartition()).to.be.equal(625)

      /// deposits
      // deposit full balance of each user into usdc pool
      await this.mw.connect(users[1]).deposit(1, parseUnits('60000', 6)) // usdc
      await this.mw.connect(users[2]).deposit(1, parseUnits('90000', 6)) // usdc
      await this.mw.connect(users[3]).deposit(1, parseUnits('350000', 6)) // usdc
      await this.mw.connect(users[4]).deposit(1, parseUnits('1500000', 6)) // usdc
      await this.mw.connect(users[5]).deposit(1, parseUnits('18000000', 6)) // usdc
      await this.mw.connect(users[6]).deposit(1, parseUnits('30000000', 6)) // usdc

      // deposit for other tokens
      await this.mw.connect(users[7]).deposit(0, parseUnits('50000000', 6)) // usdt
      await this.mw.connect(users[8]).deposit(2, parseUnits('40000000', 18)) // dai
      await this.mw.connect(users[9]).deposit(3, parseUnits('20000000', 18)) // mim
    })

    it('should claim when withdraw', async function () {
      await advanceTimeAndBlock(60 * 60 * 24 * 365) // advance one year
      expect(await this.wom.balanceOf(users[1].address)).to.eq(0)
      await this.mw.connect(users[1]).withdraw(1, 0)
      expect(await this.wom.balanceOf(users[1].address)).to.gt(0)
    })

    it('should claim when deposit', async function () {
      await advanceTimeAndBlock(60 * 60 * 24 * 365) // advance one year
      expect(await this.wom.balanceOf(users[1].address)).to.eq(0)
      await this.mw.connect(users[1]).deposit(1, 0)
      expect(await this.wom.balanceOf(users[1].address)).to.gt(0)
    })
  })

  describe('[All pools] vewom integration test', function () {
    beforeEach(async function () {
      // We make start time 60 seconds past the last block
      const startTime = (await latest()).add(60)
      const MockVeWom = await ethers.getContractFactory('MockVeWom')
      this.mockVeWom = await MockVeWom.deploy()
      await this.mockVeWom.deployed()

      // deploy master wombat
      this.mw = await this.MasterWombat.deploy()
      await this.mw.deployed()

      await this.mw.initialize(
        this.wom.address,
        this.mockVeWom.address,
        this.womPerSec,
        375, // 37.5% base => corresponds to 30% / 50% (with 20 % allocated externally)
        startTime
      )

      await this.mockVeWom.initialize(this.wom.address, this.mw.address)

      const supply = (await this.wom.totalSupply()).mul(8).div(10)
      await this.wom.connect(owner).transfer(this.mw.address, supply)
      expect(await this.wom.balanceOf(this.mw.address)).to.be.equal(supply)

      // deploy usdc and the other tokens
      this.usdc = await this.MockERC20.deploy('USDC', 'LP-USDC', 6, parseUnits('10000000000', 6))
      await this.usdc.deployed()

      this.usdt = await this.MockERC20.deploy('USDT', 'LP-USDT', 6, parseUnits('10000000000', 6))
      await this.usdt.deployed()

      this.mim = await this.MockERC20.deploy('MIM', 'LP-MIM', 18, parseEther('10000000000')) // 10 b
      await this.mim.deployed()

      this.dai = await this.MockERC20.deploy('DAI', 'LP-DAI', 18, parseEther('10000000000')) // 10 b
      await this.dai.deployed()

      // credit users with usdc
      await this.usdc.transfer(users[1].address, parseUnits('60000', 6))
      await this.usdc.transfer(users[2].address, parseUnits('90000', 6))
      await this.usdc.transfer(users[3].address, parseUnits('350000', 6))
      await this.usdc.transfer(users[4].address, parseUnits('1500000', 6))
      await this.usdc.transfer(users[5].address, parseUnits('18000000', 6))
      await this.usdc.transfer(users[6].address, parseUnits('30000000', 6))

      // credit users with mockVeWom
      await this.mockVeWom.connect(users[1]).faucet(parseEther('22000'))
      // await this.mockVeWom.connect(users[2]).faucet(parseEther('0')) // users[2] has no vewom.
      await this.mockVeWom.connect(users[3]).faucet(parseEther('3000'))
      await this.mockVeWom.connect(users[4]).faucet(parseEther('128000'))
      await this.mockVeWom.connect(users[5]).faucet(parseEther('5129300'))
      await this.mockVeWom.connect(users[6]).faucet(parseEther('16584200'))

      // approve spending by pool
      await this.usdc.connect(users[1]).approve(this.mw.address, parseUnits('60000', 6))
      await this.usdc.connect(users[2]).approve(this.mw.address, parseUnits('90000', 6))
      await this.usdc.connect(users[3]).approve(this.mw.address, parseUnits('350000', 6))
      await this.usdc.connect(users[4]).approve(this.mw.address, parseUnits('1500000', 6))
      await this.usdc.connect(users[5]).approve(this.mw.address, parseUnits('18000000', 6))
      await this.usdc.connect(users[6]).approve(this.mw.address, parseUnits('30000000', 6))

      /// other tokens
      await this.usdt.transfer(users[7].address, parseUnits('50000000', 6))
      await this.usdt.connect(users[7]).approve(this.mw.address, parseUnits('50000000', 6))

      await this.dai.transfer(users[8].address, parseEther('40000000'))
      await this.dai.connect(users[8]).approve(this.mw.address, parseUnits('40000000', 18))

      await this.mim.transfer(users[9].address, parseEther('20000000'))
      await this.mim.connect(users[9]).approve(this.mw.address, parseUnits('20000000', 18))

      // add lp-tokens to the wombat master with correct weighing
      await this.mw.add('30', this.usdt.address, ethers.constants.AddressZero)
      await this.mw.add('30', this.usdc.address, ethers.constants.AddressZero)
      await this.mw.add('25', this.dai.address, ethers.constants.AddressZero)
      await this.mw.add('15', this.mim.address, ethers.constants.AddressZero)
      expect(await this.mw.totalAllocPoint()).to.be.equal(100)
      expect(await this.mw.basePartition()).to.be.equal(375)
      expect(await this.mw.boostedPartition()).to.be.equal(625)

      // NEW USER with 10k vewom and 10k everything
      await this.mockVeWom.connect(users[10]).faucet(parseEther('10000'))

      await this.usdt.transfer(users[10].address, parseUnits('10000', 6))
      await this.usdc.transfer(users[10].address, parseUnits('10000', 6))
      await this.dai.transfer(users[10].address, parseUnits('10000', 18))
      await this.mim.transfer(users[10].address, parseUnits('10000', 18))

      await this.usdt.connect(users[10]).approve(this.mw.address, parseUnits('10000', 6))
      await this.usdc.connect(users[10]).approve(this.mw.address, parseUnits('10000', 6))
      await this.dai.connect(users[10]).approve(this.mw.address, parseUnits('10000', 18))
      await this.mim.connect(users[10]).approve(this.mw.address, parseUnits('10000', 18))

      /// deposits
      // deposit full balance of each user into usdc pool
      await this.mw.connect(users[1]).deposit(1, parseUnits('60000', 6)) // usdc
      await this.mw.connect(users[2]).deposit(1, parseUnits('90000', 6)) // usdc
      await this.mw.connect(users[3]).deposit(1, parseUnits('350000', 6)) // usdc
      await this.mw.connect(users[4]).deposit(1, parseUnits('1500000', 6)) // usdc
      await this.mw.connect(users[5]).deposit(1, parseUnits('18000000', 6)) // usdc
      await this.mw.connect(users[6]).deposit(1, parseUnits('30000000', 6)) // usdc

      // deposit for other tokens
      await this.mw.connect(users[7]).deposit(0, parseUnits('50000000', 6)) // usdt
      await this.mw.connect(users[8]).deposit(2, parseUnits('40000000', 18)) // dai
      await this.mw.connect(users[9]).deposit(3, parseUnits('20000000', 18)) // mim

      // NEW USER deposits
      await this.mw.connect(users[10]).deposit(0, parseUnits('10000', 6)) // usdc
      await this.mw.connect(users[10]).deposit(1, parseUnits('10000', 6)) // usdt
      await this.mw.connect(users[10]).deposit(2, parseUnits('10000', 18)) // dai
      await this.mw.connect(users[10]).deposit(3, parseUnits('10000', 18)) // mim
    })

    it('should set & update factor and sumOfFactors correctly', async function () {
      /// usdt 0 / usdc 1 / dai 2 / mim 3
      /// === First part === ///
      /// (1) first check each pool sumOfFactors and users[10] factor per pool
      const user10Factors = new Map<number, BigNumberish>([
        [0, sqrt(parseUnits('10000', 6).mul(parseEther('10000')))],
        [1, sqrt(parseUnits('10000', 6).mul(parseEther('10000')))],
        [2, sqrt(parseUnits('10000', 18).mul(parseEther('10000')))],
        [3, sqrt(parseUnits('10000', 18).mul(parseEther('10000')))],
      ])

      // USDT
      let usdtPoolInfo = await this.mw.poolInfo(0)
      let userInfoUsdt = await this.mw.userInfo(0, users[10].address)
      expect(userInfoUsdt.factor).to.be.equal(user10Factors.get(0))
      // users[7] has no vewom so sumOfFactors is just users[10] factor
      expect(usdtPoolInfo.sumOfFactors).to.be.equal(user10Factors.get(0))

      // USDC
      let usdcPoolInfo = await this.mw.poolInfo(1)
      let userInfoUsdc = await this.mw.userInfo(1, users[10].address)
      let usdcSumOfFactors = sqrt(parseUnits('60000', 6).mul(parseEther('22000')))
        .add(sqrt(parseUnits('350000', 6).mul(parseEther('3000'))))
        .add(sqrt(parseUnits('1500000', 6).mul(parseEther('128000'))))
        .add(sqrt(parseUnits('18000000', 6).mul(parseEther('5129300'))))
        .add(sqrt(parseUnits('30000000', 6).mul(parseEther('16584200'))))
        .add(sqrt(parseUnits('10000', 6).mul(parseEther('10000'))))
      expect(userInfoUsdc.factor).to.be.equal(user10Factors.get(1))
      expect(usdcPoolInfo.sumOfFactors).to.be.equal(usdcSumOfFactors)

      // DAI
      let daiPoolInfo = await this.mw.poolInfo(2)
      let userInfoDai = await this.mw.userInfo(2, users[10].address)
      expect(userInfoDai.factor).to.be.equal(user10Factors.get(2))
      expect(daiPoolInfo.sumOfFactors).to.be.equal(user10Factors.get(2))

      // MIM
      let mimPoolInfo = await this.mw.poolInfo(3)
      let userInfoMim = await this.mw.userInfo(3, users[10].address)
      expect(userInfoMim.factor).to.be.equal(user10Factors.get(3))
      expect(mimPoolInfo.sumOfFactors).to.be.equal(user10Factors.get(3))

      /// === Second part === ///
      /// (2) Mint vewom and see if factor and sumOfFactors updates correctly for each pool
      // mint for users[7]
      await this.wom.connect(users[7]).approve(this.mockVeWom.address, ethers.constants.MaxUint256)
      await this.wom.transfer(users[7].address, parseEther('10000'))
      await this.mockVeWom.connect(users[7]).mint(parseEther('10000'), 7)
      // mint for users[10]
      await this.wom.connect(users[10]).approve(this.mockVeWom.address, ethers.constants.MaxUint256)
      await this.wom.transfer(users[10].address, parseEther('10000'))
      await this.mockVeWom.connect(users[10]).mint(parseEther('10000'), 7)
      await this.mw.connect(users[10]).deposit(0, 0)

      // USDT
      usdtPoolInfo = await this.mw.poolInfo(0)
      userInfoUsdt = await this.mw.userInfo(0, users[10].address)
      expect(userInfoUsdt.factor).to.be.equal(sqrt(parseUnits('10000', 6).mul(parseEther('20000'))))
      // users[7] now has vewom so sumOfFactors is updated
      expect(usdtPoolInfo.sumOfFactors).to.be.equal(
        sqrt(parseUnits('50000000', 6).mul(parseEther('10000'))).add(
          sqrt(parseUnits('10000', 6).mul(parseEther('20000')))
        )
      )

      // USDC
      usdcPoolInfo = await this.mw.poolInfo(1)
      userInfoUsdc = await this.mw.userInfo(1, users[10].address)
      usdcSumOfFactors = sqrt(parseUnits('60000', 6).mul(parseEther('22000')))
        .add(sqrt(parseUnits('350000', 6).mul(parseEther('3000'))))
        .add(sqrt(parseUnits('1500000', 6).mul(parseEther('128000'))))
        .add(sqrt(parseUnits('18000000', 6).mul(parseEther('5129300'))))
        .add(sqrt(parseUnits('30000000', 6).mul(parseEther('16584200'))))
        .add(sqrt(parseUnits('10000', 6).mul(parseEther('20000'))))
      expect(userInfoUsdc.factor).to.be.equal(sqrt(parseUnits('10000', 6).mul(parseEther('20000'))))
      expect(usdcPoolInfo.sumOfFactors).to.be.equal(usdcSumOfFactors)

      // DAI
      daiPoolInfo = await this.mw.poolInfo(2)
      userInfoDai = await this.mw.userInfo(2, users[10].address)
      expect(userInfoDai.factor).to.be.equal(sqrt(parseUnits('10000', 18).mul(parseEther('20000'))))
      expect(daiPoolInfo.sumOfFactors).to.be.equal(sqrt(parseUnits('10000', 18).mul(parseEther('20000'))))

      // MIM
      mimPoolInfo = await this.mw.poolInfo(3)
      userInfoMim = await this.mw.userInfo(3, users[10].address)
      expect(userInfoMim.factor).to.be.equal(sqrt(parseUnits('10000', 18).mul(parseEther('20000'))))
      expect(mimPoolInfo.sumOfFactors).to.be.equal(sqrt(parseUnits('10000', 18).mul(parseEther('20000'))))

      /// === Third part === ///
      /// (3) then update vewom lock and see if factor and sumOfFactors updates correctly for each pool
      await this.mockVeWom.connect(users[10]).update2(parseEther('10000'), parseEther('100000'), 365)

      // USDT
      usdtPoolInfo = await this.mw.poolInfo(0)
      userInfoUsdt = await this.mw.userInfo(0, users[10].address)
      expect(userInfoUsdt.factor).to.be.equal(sqrt(parseUnits('10000', 6).mul(parseEther('110000'))))
      // users[7] now has vewom so sumOfFactors is updated
      expect(usdtPoolInfo.sumOfFactors).to.be.equal(
        sqrt(parseUnits('50000000', 6).mul(parseEther('10000'))).add(
          sqrt(parseUnits('10000', 6).mul(parseEther('110000')))
        )
      )

      // USDC
      usdcPoolInfo = await this.mw.poolInfo(1)
      userInfoUsdc = await this.mw.userInfo(1, users[10].address)
      usdcSumOfFactors = sqrt(parseUnits('60000', 6).mul(parseEther('22000')))
        .add(sqrt(parseUnits('350000', 6).mul(parseEther('3000'))))
        .add(sqrt(parseUnits('1500000', 6).mul(parseEther('128000'))))
        .add(sqrt(parseUnits('18000000', 6).mul(parseEther('5129300'))))
        .add(sqrt(parseUnits('30000000', 6).mul(parseEther('16584200'))))
        .add(sqrt(parseUnits('10000', 6).mul(parseEther('110000'))))
      expect(userInfoUsdc.factor).to.be.equal(sqrt(parseUnits('10000', 6).mul(parseEther('110000'))))
      expect(usdcPoolInfo.sumOfFactors).to.be.equal(usdcSumOfFactors)

      // DAI
      daiPoolInfo = await this.mw.poolInfo(2)
      userInfoDai = await this.mw.userInfo(2, users[10].address)
      expect(userInfoDai.factor).to.be.equal(sqrt(parseUnits('10000', 18).mul(parseEther('110000'))))
      expect(daiPoolInfo.sumOfFactors).to.be.equal(sqrt(parseUnits('10000', 18).mul(parseEther('110000'))))

      // MIM
      mimPoolInfo = await this.mw.poolInfo(3)
      userInfoMim = await this.mw.userInfo(3, users[10].address)
      expect(userInfoMim.factor).to.be.equal(sqrt(parseUnits('10000', 18).mul(parseEther('110000'))))
      expect(mimPoolInfo.sumOfFactors).to.be.equal(sqrt(parseUnits('10000', 18).mul(parseEther('110000'))))

      /// === Fourth part === ///
      /// (4) then burn vewom and see if factor and sumOfFactors updates correctly for each pool
      await this.mockVeWom.connect(users[10]).burn2(await this.mockVeWom.balanceOf(users[10].address))

      // USDT
      usdtPoolInfo = await this.mw.poolInfo(0)
      userInfoUsdt = await this.mw.userInfo(0, users[10].address)
      expect(userInfoUsdt.factor).to.be.equal(0)
      expect((await this.mw.userInfo(0, users[7].address)).factor).to.be.equal(
        sqrt(parseUnits('50000000', 6).mul(parseEther('10000')))
      )

      expect(usdtPoolInfo.sumOfFactors).to.be.equal(sqrt(parseUnits('50000000', 6).mul(parseEther('10000'))))

      // USDC
      usdcPoolInfo = await this.mw.poolInfo(1)
      userInfoUsdc = await this.mw.userInfo(1, users[10].address)
      usdcSumOfFactors = sqrt(parseUnits('60000', 6).mul(parseEther('22000')))
        .add(sqrt(parseUnits('350000', 6).mul(parseEther('3000'))))
        .add(sqrt(parseUnits('1500000', 6).mul(parseEther('128000'))))
        .add(sqrt(parseUnits('18000000', 6).mul(parseEther('5129300'))))
        .add(sqrt(parseUnits('30000000', 6).mul(parseEther('16584200'))))
      expect(userInfoUsdc.factor).to.be.equal(0)
      expect(usdcPoolInfo.sumOfFactors).to.be.equal(usdcSumOfFactors)

      // DAI
      daiPoolInfo = await this.mw.poolInfo(2)
      userInfoDai = await this.mw.userInfo(2, users[10].address)
      expect(userInfoDai.factor).to.be.equal(0)
      expect(daiPoolInfo.sumOfFactors).to.be.equal(0)

      // MIM
      mimPoolInfo = await this.mw.poolInfo(3)
      userInfoMim = await this.mw.userInfo(3, users[10].address)
      expect(userInfoMim.factor).to.be.equal(0)
      expect(mimPoolInfo.sumOfFactors).to.be.equal(0)
    })
  })

  describe('[All pools] LP token Migration', function () {
    beforeEach(async function () {
      // We make start time 60 seconds past the last block
      const startTime = (await latest()).add(60)
      const MockVeWom = await ethers.getContractFactory('MockVeWom')
      this.mockVeWom = await MockVeWom.deploy()
      await this.mockVeWom.deployed()

      // deploy master wombat
      this.mw = await this.MasterWombat.deploy()
      await this.mw.deployed()

      await this.mw.initialize(
        this.wom.address,
        this.mockVeWom.address,
        this.womPerSec,
        375, // 37.5% base => corresponds to 30% / 50% (with 20 % allocated externally)
        startTime
      )

      await this.mockVeWom.initialize(this.wom.address, this.mw.address)

      const supply = (await this.wom.totalSupply()).mul(8).div(10)
      await this.wom.connect(owner).transfer(this.mw.address, supply)
      expect(await this.wom.balanceOf(this.mw.address)).to.be.equal(supply)

      // deploy usdc and the other tokens
      this.usdc = await this.MockERC20.deploy('USDC', 'LP-USDC', 6, parseUnits('10000000000', 6))
      await this.usdc.deployed()

      this.usdt = await this.MockERC20.deploy('USDT', 'LP-USDT', 6, parseUnits('10000000000', 6))
      await this.usdt.deployed()

      this.mim = await this.MockERC20.deploy('MIM', 'LP-MIM', 18, parseEther('10000000000')) // 10 b
      await this.mim.deployed()

      this.dai = await this.MockERC20.deploy('DAI', 'LP-DAI', 18, parseEther('10000000000')) // 10 b
      await this.dai.deployed()

      // credit users with usdc
      await this.usdc.transfer(users[1].address, parseUnits('60000', 6))
      await this.usdc.transfer(users[2].address, parseUnits('90000', 6))
      await this.usdc.transfer(users[3].address, parseUnits('350000', 6))
      await this.usdc.transfer(users[4].address, parseUnits('1500000', 6))
      await this.usdc.transfer(users[5].address, parseUnits('18000000', 6))
      await this.usdc.transfer(users[6].address, parseUnits('30000000', 6))

      // credit users with mockVeWom
      await this.mockVeWom.connect(users[1]).faucet(parseEther('22000'))
      // await this.mockVeWom.connect(users[2]).faucet(parseEther('0')) // users[2] has no vewom.
      await this.mockVeWom.connect(users[3]).faucet(parseEther('3000'))
      await this.mockVeWom.connect(users[4]).faucet(parseEther('128000'))
      await this.mockVeWom.connect(users[5]).faucet(parseEther('5129300'))
      await this.mockVeWom.connect(users[6]).faucet(parseEther('16584200'))

      // approve spending by pool
      await this.usdc.connect(users[1]).approve(this.mw.address, parseUnits('60000', 6))
      await this.usdc.connect(users[2]).approve(this.mw.address, parseUnits('90000', 6))
      await this.usdc.connect(users[3]).approve(this.mw.address, parseUnits('350000', 6))
      await this.usdc.connect(users[4]).approve(this.mw.address, parseUnits('1500000', 6))
      await this.usdc.connect(users[5]).approve(this.mw.address, parseUnits('18000000', 6))
      await this.usdc.connect(users[6]).approve(this.mw.address, parseUnits('30000000', 6))

      /// other tokens
      await this.usdt.transfer(users[7].address, parseUnits('50000000', 6))
      await this.usdt.connect(users[7]).approve(this.mw.address, parseUnits('50000000', 6))

      await this.dai.transfer(users[8].address, parseEther('40000000'))
      await this.dai.connect(users[8]).approve(this.mw.address, parseUnits('40000000', 18))

      await this.mim.transfer(users[9].address, parseEther('20000000'))
      await this.mim.connect(users[9]).approve(this.mw.address, parseUnits('20000000', 18))

      // add lp-tokens to the wombat master with correct weighing
      await this.mw.add('30', this.usdt.address, ethers.constants.AddressZero)
      await this.mw.add('30', this.usdc.address, ethers.constants.AddressZero)
      await this.mw.add('25', this.dai.address, ethers.constants.AddressZero)
      await this.mw.add('15', this.mim.address, ethers.constants.AddressZero)
      expect(await this.mw.totalAllocPoint()).to.be.equal(100)
      expect(await this.mw.basePartition()).to.be.equal(375)
      expect(await this.mw.boostedPartition()).to.be.equal(625)

      /// deposits
      // deposit full balance of each user into usdc pool
      await this.mw.connect(users[1]).deposit(1, parseUnits('60000', 6)) // usdc
      await this.mw.connect(users[2]).deposit(1, parseUnits('90000', 6)) // usdc
      await this.mw.connect(users[3]).deposit(1, parseUnits('350000', 6)) // usdc
      await this.mw.connect(users[4]).deposit(1, parseUnits('1500000', 6)) // usdc
      await this.mw.connect(users[5]).deposit(1, parseUnits('18000000', 6)) // usdc
      await this.mw.connect(users[6]).deposit(1, parseUnits('30000000', 6)) // usdc

      // deposit for other tokens
      await this.mw.connect(users[7]).deposit(0, parseUnits('50000000', 6)) // usdt
      await this.mw.connect(users[8]).deposit(2, parseUnits('40000000', 18)) // dai
      await this.mw.connect(users[9]).deposit(3, parseUnits('20000000', 18)) // mim
    })

    it('should revert if newMasterWombat not set', async function () {
      await expect(this.mw.connect(users[1]).migrate([1, 0])).to.be.revertedWith('to where?')
    })

    it('user should be able to migrate once only ', async function () {
      await advanceTimeAndBlock(60 * 60 * 24 * 365) // advance one year

      // deploy V2 master wombat
      const startTime = (await latest()).add(60)
      this.mwV2 = await this.MasterWombat.deploy()
      await this.mw.deployed()

      await this.mwV2.initialize(
        this.wom.address,
        this.mockVeWom.address,
        this.womPerSec,
        500, // 50% base => corresponds to 40% / 40% (with 20 % allocated externally)
        startTime
      )
      await this.mwV2.add('30', this.usdt.address, ethers.constants.AddressZero)
      await this.mwV2.add('30', this.usdc.address, ethers.constants.AddressZero)
      await this.mwV2.add('25', this.dai.address, ethers.constants.AddressZero)
      await this.mwV2.add('15', this.mim.address, ethers.constants.AddressZero)

      this.mw.connect(owner).setNewMasterWombat(this.mwV2.address)

      // migrate usdc users[1]
      const [pendingTokens] = await this.mw.connect(users[1]).pendingTokens(1, users[1].address)
      const [amountPool1] = await this.mw.userInfo(1, users[1].address)
      const [amountPool0] = await this.mw.userInfo(0, users[1].address)
      await this.mw.connect(users[1]).migrate([1, 0])
      expect(await this.wom.balanceOf(users[1].address)).to.near(parseEther('276.094205374401850755'))
      expect(await this.wom.balanceOf(users[1].address)).to.near(pendingTokens)
      expect((await this.mwV2.userInfo(1, users[1].address)).amount).to.equal(amountPool1)
      expect((await this.mwV2.userInfo(0, users[1].address)).amount).to.equal(amountPool0)

      // nothing to migrate, nothing should be claimed and migrated
      await this.mw.connect(users[1]).migrate([1, 0])
      expect(await this.wom.balanceOf(users[1].address)).to.near(parseEther('276.094205374401850755'))
      expect(await this.wom.balanceOf(users[1].address)).to.near(pendingTokens)
      expect((await this.mwV2.userInfo(1, users[1].address)).amount).to.equal(amountPool1)
      expect((await this.mwV2.userInfo(0, users[1].address)).amount).to.equal(amountPool0)
    })

    it('should claim wom before migrate()', async function () {
      await advanceTimeAndBlock(60 * 60 * 24 * 365) // advance one year

      // deploy V2 master wombat
      const startTime = (await latest()).add(60)
      this.mwV2 = await this.MasterWombat.deploy()
      await this.mw.deployed()

      await this.mwV2.initialize(
        this.wom.address,
        this.mockVeWom.address,
        this.womPerSec,
        500, // 50% base => corresponds to 40% / 40% (with 20 % allocated externally)
        startTime
      )
      await this.mwV2.add('30', this.usdt.address, ethers.constants.AddressZero)
      await this.mwV2.add('30', this.usdc.address, ethers.constants.AddressZero)
      await this.mwV2.add('25', this.dai.address, ethers.constants.AddressZero)
      await this.mwV2.add('15', this.mim.address, ethers.constants.AddressZero)

      await this.mw.connect(owner).setNewMasterWombat(this.mwV2.address)

      // migrate usdc users[1]
      let [pendingTokens] = await this.mw.connect(users[1]).pendingTokens(1, users[1].address)
      let [amountPool1] = await this.mw.userInfo(1, users[1].address)
      let [amountPool0] = await this.mw.userInfo(0, users[1].address)
      await this.mw.connect(users[1]).migrate([1, 0])
      expect(await this.wom.balanceOf(users[1].address)).to.near(parseEther('276.094205374401850755'))
      expect(await this.wom.balanceOf(users[1].address)).to.near(pendingTokens)
      expect((await this.mwV2.userInfo(1, users[1].address)).amount).to.equal(amountPool1)
      expect((await this.mwV2.userInfo(0, users[1].address)).amount).to.equal(amountPool0)

      // migrate usdc users[2]
      ;[pendingTokens] = await this.mw.connect(users[2]).pendingTokens(1, users[2].address)
      ;[amountPool1] = await this.mw.userInfo(1, users[2].address)
      ;[amountPool0] = await this.mw.userInfo(0, users[2].address)
      await this.mw.connect(users[2]).migrate([1, 0])
      expect(await this.wom.balanceOf(users[2].address)).to.near(parseEther('161.999969184253980190'))
      expect(await this.wom.balanceOf(users[2].address)).to.near(pendingTokens)
      expect((await this.mwV2.userInfo(1, users[2].address)).amount).to.equal(amountPool1)
      expect((await this.mwV2.userInfo(0, users[2].address)).amount).to.equal(amountPool0)
    })

    it('should claim wom in both old and new MasterWombat pool during migrate()', async function () {
      await advanceTimeAndBlock(60 * 60 * 24 * 365) // advance one year

      // initialize mpV2
      {
        const startTime = (await latest()).add(60 * 60 * 24)
        // deploy master wombat
        this.mwV2 = await this.MasterWombat.deploy()
        await this.mwV2.deployed()

        await this.mwV2.initialize(
          this.wom.address,
          this.mockVeWom.address,
          this.womPerSec,
          375, // 37.5% base => corresponds to 30% / 50% (with 20 % allocated externally)
          startTime
        )

        // transfer remaining 20% of wom supply to master wombat contract
        const supply = (await this.wom.totalSupply()).mul(2).div(10)
        await this.wom.connect(owner).transfer(this.mwV2.address, supply)
        expect(await this.wom.balanceOf(this.mwV2.address)).to.be.equal(supply)

        // credit users with usdc
        await this.usdc.transfer(users[1].address, parseUnits('60000', 6))
        await this.usdc.transfer(users[2].address, parseUnits('90000', 6))
        await this.usdc.transfer(users[3].address, parseUnits('350000', 6))
        await this.usdc.transfer(users[4].address, parseUnits('1500000', 6))
        await this.usdc.transfer(users[5].address, parseUnits('18000000', 6))
        await this.usdc.transfer(users[6].address, parseUnits('30000000', 6))

        // approve spending by pool
        await this.usdc.connect(users[1]).approve(this.mwV2.address, parseUnits('60000', 6))
        await this.usdc.connect(users[2]).approve(this.mwV2.address, parseUnits('90000', 6))
        await this.usdc.connect(users[3]).approve(this.mwV2.address, parseUnits('350000', 6))
        await this.usdc.connect(users[4]).approve(this.mwV2.address, parseUnits('1500000', 6))
        await this.usdc.connect(users[5]).approve(this.mwV2.address, parseUnits('18000000', 6))
        await this.usdc.connect(users[6]).approve(this.mwV2.address, parseUnits('30000000', 6))

        /// other tokens
        await this.usdt.transfer(users[7].address, parseUnits('50000000', 6))
        await this.usdt.connect(users[7]).approve(this.mwV2.address, parseUnits('50000000', 6))

        await this.dai.transfer(users[8].address, parseEther('40000000'))
        await this.dai.connect(users[8]).approve(this.mwV2.address, parseUnits('40000000', 18))

        await this.mim.transfer(users[9].address, parseEther('20000000'))
        await this.mim.connect(users[9]).approve(this.mwV2.address, parseUnits('20000000', 18))

        // add lp-tokens to the wombat master with correct weighing
        await this.mwV2.add('30', this.usdt.address, ethers.constants.AddressZero)
        await this.mwV2.add('30', this.usdc.address, ethers.constants.AddressZero)
        await this.mwV2.add('25', this.dai.address, ethers.constants.AddressZero)
        await this.mwV2.add('15', this.mim.address, ethers.constants.AddressZero)
        expect(await this.mwV2.totalAllocPoint()).to.be.equal(100)
        expect(await this.mwV2.basePartition()).to.be.equal(375)
        expect(await this.mwV2.boostedPartition()).to.be.equal(625)

        /// deposits
        // deposit full balance of each user into usdc pool
        await this.mwV2.connect(users[1]).deposit(1, parseUnits('60000', 6)) // usdc
        await this.mwV2.connect(users[2]).deposit(1, parseUnits('90000', 6)) // usdc
        await this.mwV2.connect(users[3]).deposit(1, parseUnits('350000', 6)) // usdc
        await this.mwV2.connect(users[4]).deposit(1, parseUnits('1500000', 6)) // usdc
        await this.mwV2.connect(users[5]).deposit(1, parseUnits('18000000', 6)) // usdc
        await this.mwV2.connect(users[6]).deposit(1, parseUnits('30000000', 6)) // usdc

        // deposit for other tokens
        await this.mwV2.connect(users[7]).deposit(0, parseUnits('50000000', 6)) // usdt
        await this.mwV2.connect(users[8]).deposit(2, parseUnits('40000000', 18)) // dai
        await this.mwV2.connect(users[9]).deposit(3, parseUnits('20000000', 18)) // mim
      }

      // migration to new pool
      await this.mw.connect(owner).updateEmissionRate(0)
      await this.mw.connect(owner).setNewMasterWombat(this.mwV2.address)
      await advanceTimeAndBlock(60 * 60 * 24 * 366) // advance a year

      // migrate usdc users[1]
      let [pendingTokens] = await this.mw.connect(users[1]).pendingTokens(1, users[1].address)
      let [amountPool1] = await this.mw.userInfo(1, users[1].address)
      let [amountPool0] = await this.mw.userInfo(0, users[1].address)
      await this.mw.connect(users[1]).migrate([1, 0])
      expect(pendingTokens).to.near(parseEther('276.094441756479480519'))
      expect(await this.wom.balanceOf(users[1].address)).to.near(pendingTokens.mul(2)) // half tokens are from the old pool, half are from the new pool
      expect((await this.mwV2.userInfo(1, users[1].address)).amount).to.equal(amountPool1.mul(2))
      expect((await this.mwV2.userInfo(0, users[1].address)).amount).to.equal(amountPool0)

      // migrate usdc users[2]
      ;[pendingTokens] = await this.mw.connect(users[2]).pendingTokens(1, users[2].address)
      ;[amountPool1] = await this.mw.userInfo(1, users[2].address)
      ;[amountPool0] = await this.mw.userInfo(0, users[2].address)
      await this.mw.connect(users[2]).migrate([1, 0])
      expect(pendingTokens).to.near(parseEther('162.000102739726026098'))
      expect(await this.wom.balanceOf(users[2].address)).to.near(pendingTokens.mul(2)) // half tokens are from the old pool, half are from the new pool
      expect((await this.mwV2.userInfo(1, users[2].address)).amount).to.equal(amountPool1.mul(2))
      expect((await this.mwV2.userInfo(0, users[2].address)).amount).to.equal(amountPool0)
    })
  })
})
