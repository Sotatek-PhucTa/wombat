import { BigNumber } from '@ethersproject/bignumber'
import { toUtf8Bytes } from '@ethersproject/strings'
import { parseEther } from '@ethersproject/units'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { ethers, network } from 'hardhat'
import { near } from './assertions/near'
import { advanceTimeAndBlock, latest } from './helpers'
import { Ability } from './helpers/nft'

chai.use(solidity)
chai.use(near)

describe('VeWOM', function () {
  let owner: SignerWithAddress
  let users: SignerWithAddress[]

  before(async function () {
    this.signers = await ethers.getSigners()

    const [first, ...rest] = await ethers.getSigners()
    owner = first
    users = rest

    this.MasterWombat = await ethers.getContractFactory('MasterWombat')
    this.MockAttacker = await ethers.getContractFactory('MockAttacker')
    this.Whitelist = await ethers.getContractFactory('Whitelist')
    this.Wom = await ethers.getContractFactory('WombatERC20')
    this.VeWom = await ethers.getContractFactory('VeWom')
    this.MockERC20 = await ethers.getContractFactory('MockERC20')
    this.Nft = await ethers.getContractFactory('MockNFT')

    this.womPerSec = parseEther('0.9259259259259259')

    this.reward = (sec: number, percent: number) => {
      return (sec * this.womPerSec * percent) / 1000
    }
  })

  beforeEach(async function () {
    const startTime = (await latest()).add(60)

    this.wom = await this.Wom.connect(owner).deploy(parseEther('1000000000')) // 1 bil WOM tokens
    this.veWom = await this.VeWom.deploy()
    this.veWom.deployed()

    this.mWom = await this.MasterWombat.deploy()
    this.mWom.connect(owner).initialize(this.wom.address, this.veWom.address, this.womPerSec, startTime)

    this.nft = await this.Nft.deploy()
    await this.nft.deployed()

    this.mWom.deployed()
    this.veWom.initialize(this.wom.address, this.mWom.address, this.nft.address)
  })

  it('should set correct name and symbol', async function () {
    expect(await this.veWom.name()).to.be.equal('Wombat Waddle')
    expect(await this.veWom.symbol()).to.be.equal('veWOM')
    expect(await this.veWom.decimals()).to.be.equal(18)
    expect(await this.veWom.totalSupply()).to.be.equal(0)
  })

  it('should initialize to correct generation rate and max cap', async function () {
    expect(await this.veWom.maxCap()).to.be.equal(100)
    expect(await this.veWom.generationRate()).to.be.equal(3888888888888)
  })

  it('should setInvVoteThreshold', async function () {
    expect(await this.veWom.invVoteThreshold()).to.be.equal(20)
    await this.veWom.setInvVoteThreshold(33)
    expect(await this.veWom.invVoteThreshold()).to.be.equal(33)
    await expect(this.veWom.connect(users[1]).setInvVoteThreshold(33)).to.be.revertedWith(
      'Ownable: caller is not the owner'
    )

    await expect(this.veWom.setInvVoteThreshold(0)).to.be.revertedWith('invVoteThreshold cannot be zero')
  })

  it('should set MasterWombat correctly', async function () {
    await this.veWom.setMasterWombat(users[1].address)
    expect(await this.veWom.masterWombat()).to.be.equal(users[1].address)

    await expect(this.veWom.setMasterWombat(ethers.constants.AddressZero)).to.be.reverted
  })

  it('should set NFT correctly', async function () {
    // first expect to revert if called from not owner
    await expect(this.veWom.connect(users[1]).setNftAddress(users[10].address)).to.be.revertedWith(
      'Ownable: caller is not the owner'
    )

    await expect(this.veWom.setNftAddress(ethers.constants.AddressZero)).to.be.revertedWith('zero address')

    // then set nft address
    await this.veWom.setNftAddress(users[10].address)
    expect(await this.veWom.nft()).to.be.equal(users[10].address)
  })

  it('should set max cap correctly', async function () {
    // first expect to revert if called from not owner
    await expect(this.veWom.connect(users[1]).setMaxCap(50)).to.be.revertedWith('Ownable: caller is not the owner')

    await expect(this.veWom.setMaxCap(0)).to.be.revertedWith('max cap cannot be zero')

    // then set nft address
    await this.veWom.setMaxCap(50)
    expect(await this.veWom.maxCap()).to.be.equal(50)
  })

  it('should set generation rate correctly', async function () {
    // first expect to revert if called from not owner
    await expect(this.veWom.connect(users[1]).setGenerationRate(3333333333333)).to.be.revertedWith(
      'Ownable: caller is not the owner'
    )

    await expect(this.veWom.setGenerationRate(0)).to.be.revertedWith('generation rate cannot be zero')

    // then set nft address
    await this.veWom.setGenerationRate(3333333333333)
    expect(await this.veWom.generationRate()).to.be.equal(3333333333333)
  })

  it('should pause and unpause', async function () {
    // Pause pool : expect to emit event and for state pause event to change
    const receipt1 = await this.veWom.connect(owner).pause()
    expect(await this.veWom.paused()).to.equal(true)
    await expect(receipt1).to.emit(this.veWom, 'Paused').withArgs(owner.address)

    // Unpause pool : expect emit event and state change
    const receipt2 = await this.veWom.connect(owner).unpause()
    expect(await this.veWom.paused()).to.equal(false)

    await expect(receipt2).to.emit(this.veWom, 'Unpaused').withArgs(owner.address)

    // restricts to owner
    await expect(this.veWom.connect(users[0]).pause()).to.be.revertedWith('Ownable: caller is not the owner')
    await expect(this.veWom.connect(users[0]).unpause()).to.be.revertedWith('Ownable: caller is not the owner')
  })

  it('should not allow deposit if not enough approve', async function () {
    await expect(this.veWom.deposit('100')).to.be.revertedWith('ERC20: transfer amount exceeds allowance')
    await this.wom.approve(this.veWom.address, '50')
    await expect(this.veWom.deposit('100')).to.be.revertedWith('ERC20: transfer amount exceeds allowance')

    const beforeWomBalance = await this.wom.balanceOf(owner.address)
    await this.wom.approve(this.veWom.address, '100')
    await this.veWom.deposit('100')

    const afterWomBalance = await this.wom.balanceOf(owner.address)
    expect(afterWomBalance.sub(beforeWomBalance)).to.equal(-100)
  })

  it('should not allow deposit from smart contract unless whitelisted', async function () {
    // try to attack by depositing from a contract
    this.mockAttacker = await this.MockAttacker.deploy(this.wom.address, this.veWom.address)
    await this.mockAttacker.approve(100)
    await this.wom.transfer(this.mockAttacker.address, 100)
    await expect(this.mockAttacker.deposit(100)).to.be.revertedWith('Smart contract depositors not allowed')

    // now add the mock Attacker to whitelist
    this.whitelist = await this.Whitelist.deploy()
    // should revert if not owner is calling onlyOwner methods
    await expect(this.whitelist.connect(users[1]).approveWallet(this.mockAttacker.address)).to.be.revertedWith(
      'Ownable: caller is not the owner'
    )

    await this.whitelist.approveWallet(this.mockAttacker.address)

    // set whitelist on veWom
    await this.veWom.setWhitelist(this.whitelist.address)
    expect(await this.veWom.whitelist()).to.be.equal(this.whitelist.address)

    // deposit via mockAttacker
    await expect(this.mockAttacker.deposit(100)).to.be.ok

    // should also revoke wallet approriately
    await this.whitelist.revokeWallet(this.mockAttacker.address)
    await expect(this.mockAttacker.deposit(100)).to.be.revertedWith('Smart contract depositors not allowed')
  })

  it('should not allow withraw more than what you have', async function () {
    await this.wom.approve(this.veWom.address, '100')
    await this.veWom.deposit('100')
    expect(await this.veWom.getStakedAmount(owner.address)).to.be.equal('100')
    await expect(this.veWom.withdraw('200')).to.be.revertedWith('not enough balance')

    // advance a year
    await advanceTimeAndBlock(3.154e7)

    const beforeWomBalance = await this.wom.balanceOf(owner.address)
    await this.veWom.withdraw('100')
    expect(await this.veWom.getStakedAmount(owner.address)).to.be.equal('0')
    const afterWomBalance = await this.wom.balanceOf(owner.address)
    expect(afterWomBalance.sub(beforeWomBalance)).to.equal(100)

    /// == Same test again but this time claim in the middle to test for burn == //
    await this.wom.approve(this.veWom.address, '100')
    await this.veWom.deposit('100')
    expect(await this.veWom.getStakedAmount(owner.address)).to.be.equal('100')

    // advance a month
    await advanceTimeAndBlock(2628000)
    const beforeBalance = await this.veWom.balanceOf(owner.address)
    const claimable = await this.veWom.claimable(owner.address)
    await this.veWom.connect(owner).claim()
    const afterBalance = await this.veWom.balanceOf(owner.address)

    expect(await this.veWom.balanceOf(owner.address)).to.be.near(BigNumber.from('1022'))
    expect(await this.veWom.balanceOf(owner.address)).to.be.near(claimable)
    expect(afterBalance.sub(beforeBalance)).to.be.equal(claimable)

    // if we try to withdraw a partial amount of the staked wom, it will still burn all of it
    const beforeWomBalance2 = await this.wom.balanceOf(owner.address)
    await this.veWom.withdraw('50')
    const afterWomBalance2 = await this.wom.balanceOf(owner.address)
    expect(afterWomBalance2.sub(beforeWomBalance2)).to.equal(50)
    expect(await this.veWom.balanceOf(owner.address)).to.be.equal('0')

    // nothing left to claim
    expect(await this.veWom.claimable(owner.address)).to.be.equal(0)
  })

  it('should cast votes only if cap > 5%', async function () {
    // deposit 100 wom into veWOM contract
    await this.wom.connect(owner).transfer(users[0].address, parseEther('100'))
    await this.wom.connect(users[0]).approve(this.veWom.address, parseEther('100'))
    await this.veWom.connect(users[0]).deposit(parseEther('100'))
    // check votes == 0
    expect(await this.veWom.getVotes(users[0].address)).to.be.equal(0)

    // Advance quarter of a month. Should not reach min 5%
    const monthInSeconds = 60 * 60 * 24 * (365 / 12)
    await advanceTimeAndBlock(monthInSeconds / 4)
    await this.veWom.connect(users[0]).claim()

    // check votes == 0
    expect(await this.veWom.getVotes(users[0].address)).to.be.equal(0)
    expect(await this.veWom.getVotes(users[0].address)).to.be.not.equal(await this.veWom.balanceOf(users[0].address))
    // console.log(formatEther(await this.veWom.getVotes(users[0].address)))
    // console.log((formatEther(await this.veWom.balanceOf(users[0].address)).toString()))

    // Advance quarter of a month. Should now reach min 5%
    await advanceTimeAndBlock(monthInSeconds / 4)
    await this.veWom.connect(users[0]).claim()

    // check votes == balance
    expect(await this.veWom.getVotes(users[0].address)).to.be.equal(await this.veWom.balanceOf(users[0].address))
    // console.log(formatEther(await this.veWom.getVotes(users[0].address)))
    // console.log((formatEther(await this.veWom.balanceOf(users[0].address)).toString()))
  })

  it('should reach full cap in around 10 months', async function () {
    // deposit 100 wom into veWOM
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(0)
    await this.wom.connect(owner).transfer(users[0].address, parseEther('100'))
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('100'))
    await this.wom.connect(users[0]).approve(this.veWom.address, parseEther('100'))
    await this.veWom.connect(users[0]).deposit(parseEther('100'))
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('0'))

    // advance time 10 months
    const monthInSeconds = 60 * 60 * 24 * (365 / 12)
    await advanceTimeAndBlock(monthInSeconds * 10)

    // claim veWOM
    const beforeBalance = await this.veWom.balanceOf(users[0].address)
    const claimable = await this.veWom.claimable(users[0].address)
    await this.veWom.connect(users[0]).claim()
    const afterBalance = await this.veWom.balanceOf(users[0].address)
    expect(await this.veWom.balanceOf(users[0].address)).to.be.near(parseEther('10000'))
    expect(afterBalance.sub(beforeBalance)).to.be.near(claimable)
    // check votes == balance
    expect(await this.veWom.getVotes(users[0].address)).to.be.equal(afterBalance.sub(beforeBalance))

    // ROUND 2
    // now withdraw the wom
    await this.veWom.connect(users[0]).withdraw(parseEther('100'))
    expect(await this.veWom.balanceOf(users[0].address)).to.be.equal(parseEther('0'))
    // check votes == 0
    expect(await this.veWom.getVotes(users[0].address)).to.be.equal(0)

    // deposit again
    await this.wom.connect(users[0]).approve(this.veWom.address, parseEther('100'))
    await this.veWom.connect(users[0]).deposit(parseEther('100'))

    // advance time 1 month
    await advanceTimeAndBlock(monthInSeconds)

    // claim veWOM
    await this.veWom.connect(users[0]).claim()
    expect(await this.veWom.balanceOf(users[0].address)).to.be.near(parseEther('1022.0003888886553'))

    // advance time 1 month
    await advanceTimeAndBlock(monthInSeconds)

    // claim veWOM
    await this.veWom.connect(users[0]).claim()
    expect(await this.veWom.balanceOf(users[0].address)).to.be.near(parseEther('2044'))

    // advance time
    await advanceTimeAndBlock(monthInSeconds * 28)

    // claim veWOM - max cap should be reached
    await this.veWom.connect(users[0]).claim()
    expect(await this.veWom.balanceOf(users[0].address)).to.be.equal(parseEther('10000'))
    expect(await this.veWom.connect(users[0]).claimable(users[0].address)).to.be.equal(0)
  })

  it('should accumulate ~10 veWom per wom deposited per month', async function () {
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(0)
    // deposit 100 wom into veWOM
    await this.wom.connect(owner).transfer(users[0].address, parseEther('100'))
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('100'))
    await this.wom.connect(users[0]).approve(this.veWom.address, parseEther('100'))
    await this.veWom.connect(users[0]).deposit(parseEther('100'))
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('0'))
    expect(await this.veWom.getStakedAmount(users[0].address)).to.be.equal(parseEther('100'))

    // advance time a month
    const monthInSeconds = 60 * 60 * 24 * (365 / 12)
    await advanceTimeAndBlock(monthInSeconds)

    // claim veWOM
    let claimable = await this.veWom.claimable(users[0].address)
    await this.veWom.connect(users[0]).claim()
    expect(await this.veWom.balanceOf(users[0].address)).to.be.near(parseEther('1022.0003888886553'))
    expect(await this.veWom.balanceOf(users[0].address)).to.be.near(claimable)

    // deposit 10_000 wom using users[1]
    await this.wom.connect(owner).transfer(users[1].address, parseEther('10000'))
    expect(await this.wom.balanceOf(users[1].address)).to.be.equal(parseEther('10000'))
    await this.wom.connect(users[1]).approve(this.veWom.address, parseEther('10000'))
    await this.veWom.connect(users[1]).deposit(parseEther('10000'))

    // advance time a month
    await advanceTimeAndBlock(monthInSeconds)

    // claim user[0]
    claimable = await this.veWom.claimable(users[0].address)
    let beforeBalance = await this.veWom.balanceOf(users[0].address)
    await this.veWom.connect(users[0]).claim()
    let afterBalance = await this.veWom.balanceOf(users[0].address)
    expect(await this.veWom.balanceOf(users[0].address)).to.be.near(parseEther('2044'))
    expect(afterBalance.sub(beforeBalance)).to.be.near(claimable)

    // claim users[1]
    claimable = await this.veWom.claimable(users[1].address)
    beforeBalance = await this.veWom.balanceOf(users[1].address)
    await this.veWom.connect(users[1]).claim()
    afterBalance = await this.veWom.balanceOf(users[1].address)
    expect(afterBalance.sub(beforeBalance)).to.be.near(claimable)
    expect(await this.veWom.balanceOf(users[1].address)).to.be.near(parseEther('102200'))

    // advance 5 year
    await advanceTimeAndBlock(monthInSeconds * 12 * 5)

    // claim user[0]
    await this.veWom.connect(users[0]).claim()
    expect(await this.veWom.balanceOf(users[0].address)).to.be.near(parseEther('10000'))

    // claim users[1]
    claimable = await this.veWom.claimable(users[1].address)
    beforeBalance = await this.veWom.balanceOf(users[1].address)
    await this.veWom.connect(users[1]).claim()
    afterBalance = await this.veWom.balanceOf(users[1].address)
    expect(await this.veWom.balanceOf(users[1].address)).to.be.near(parseEther('1000000'))
    expect(afterBalance.sub(beforeBalance)).to.be.near(claimable)

    // both users have reached their maximum potential.
    // if we claim, they should not receive any more veWom
    // claim user[0]
    claimable = await this.veWom.claimable(users[0].address)
    await this.veWom.connect(users[0]).claim()
    expect(await this.veWom.balanceOf(users[0].address)).to.be.near(parseEther('10000'))
    expect(claimable).to.be.equal(0)

    // claim users[1]
    claimable = await this.veWom.claimable(users[1].address)
    await this.veWom.connect(users[1]).claim()
    expect(await this.veWom.balanceOf(users[1].address)).to.be.near(parseEther('1000000'))
    expect(claimable).to.be.equal(0)
  })

  it('should allow depositing several times', async function () {
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(0)
    // deposit 100 wom into veWOM
    await this.wom.connect(owner).transfer(users[0].address, parseEther('100'))
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('100'))
    await this.wom.connect(users[0]).approve(this.veWom.address, parseEther('100'))
    await this.veWom.connect(users[0]).deposit(parseEther('100'))
    expect(await this.veWom.getStakedAmount(users[0].address)).to.be.equal(parseEther('100'))
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('0'))

    // advance time a month
    const monthInSeconds = 60 * 60 * 24 * (365 / 12)
    await advanceTimeAndBlock(monthInSeconds)

    // deposit again, this time 300
    await this.wom.connect(owner).transfer(users[0].address, parseEther('300'))
    await this.wom.connect(users[0]).approve(this.veWom.address, parseEther('300'))
    await this.veWom.connect(users[0]).deposit(parseEther('300'))
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('0'))
    expect(await this.veWom.getStakedAmount(users[0].address)).to.be.equal(parseEther('400'))

    // last deposit should have claimed rewards for users[0]
    expect(await this.veWom.balanceOf(users[0].address)).to.be.near(parseEther('1022.001166666433'))

    // deposit using users[1]
    await this.wom.connect(owner).transfer(users[1].address, parseEther('10000'))
    expect(await this.wom.balanceOf(users[1].address)).to.be.equal(parseEther('10000'))
    await this.wom.connect(users[1]).approve(this.veWom.address, parseEther('10000'))
    await this.veWom.connect(users[1]).deposit(parseEther('10000'))
    expect(await this.veWom.getStakedAmount(users[1].address)).to.be.equal(parseEther('10000'))

    // advance time a month
    await advanceTimeAndBlock(monthInSeconds)

    // claim user[0]
    await this.veWom.connect(users[0]).claim()
    expect(await this.veWom.balanceOf(users[0].address)).to.be.near(parseEther('5110'))

    // claim users[1]
    await this.veWom.connect(users[1]).claim()
    expect(await this.veWom.balanceOf(users[1].address)).to.be.near(parseEther('102200'))

    // advance 5 year
    await advanceTimeAndBlock(monthInSeconds * 12 * 5)

    // claim user[0]
    await this.veWom.connect(users[0]).claim()
    expect(await this.veWom.balanceOf(users[0].address)).to.be.equal(parseEther('40000'))

    // claim users[1]
    await this.veWom.connect(users[1]).claim()
    expect(await this.veWom.balanceOf(users[1].address)).to.be.equal(parseEther('1000000'))
  })

  it('cannot stake nft if user has no wom staked', async function () {
    await this.nft.connect(users[8]).mint(Ability.DILIGENT, 30, 24, 4, 4, 4, 4, 4, 4)
    expect(await this.veWom.isUser(users[8].address)).to.be.false

    await expect(
      this.nft.connect(users[8])['safeTransferFrom(address,address,uint256)'](users[8].address, this.veWom.address, 0)
    ).to.be.revertedWith('user has no stake')
  })

  it('stakes nft', async function () {
    await this.nft.connect(users[0]).mint(Ability.DILIGENT, 30, 24, 4, 4, 4, 4, 4, 4)
    await this.nft.connect(users[0]).mint(Ability.ENDOWED, 4012345678, 12, 2, 2, 2, 2, 2, 2)

    // cannot stake if not own
    await expect(
      this.nft['safeTransferFrom(address,address,uint256)'](users[1].address, this.veWom.address, 0)
    ).to.be.revertedWith('ERC721: transfer caller is not owner nor approved')

    // one needs to stake wom before depositing any nft
    await this.wom.transfer(users[0].address, parseEther('100'))
    await this.wom.connect(users[0]).approve(this.veWom.address, parseEther('100'))
    await this.veWom.connect(users[0]).deposit(parseEther('100'))
    expect(await this.veWom.isUser(users[0].address)).to.be.true

    // staking
    let receipt = await this.nft
      .connect(users[0])
      ['safeTransferFrom(address,address,uint256)'](users[0].address, this.veWom.address, 0)
    expect(receipt).to.emit(this.veWom, 'StakedNft').withArgs(users[0].address, 0)

    // check staked NFT
    expect(await this.veWom.getStakedNft(users[0].address)).to.be.equal(0)
    expect(await this.nft.ownerOf(0)).to.be.equal(this.veWom.address)

    // user is not staking
    await expect(this.veWom.getStakedNft(users[1].address)).to.be.revertedWith('not staking')

    // get ability of staked NFT
    expect(await this.nft.getWombatDetails(0)).to.be.deep.equal([0, Ability.DILIGENT, 30])
    expect(await this.nft.getWombatDetails(1)).to.be.deep.equal([0, Ability.ENDOWED, 4012345678])
    await expect(this.nft.getWombatDetails(2)).to.be.revertedWith('Wombat not exist')

    // Cannot double stake the same NFT
    await expect(
      this.nft.connect(users[1])['safeTransferFrom(address,address,uint256)'](users[0].address, this.veWom.address, 0)
    ).to.be.revertedWith('ERC721: transfer caller is not owner nor approved')

    // stake another NFT
    receipt = await this.nft
      .connect(users[0])
      ['safeTransferFrom(address,address,uint256,bytes)'](
        users[0].address,
        this.veWom.address,
        1,
        toUtf8Bytes('some string')
      )

    // expect events to emit
    expect(receipt)
      .to.emit(this.veWom, 'UnstakedNft')
      .withArgs(users[0].address, 0)
      .to.emit(this.veWom, 'StakedNft')
      .withArgs(users[0].address, 1)

    expect(await this.veWom.getStakedNft(users[0].address)).to.be.equal(1)
    expect(await this.nft.ownerOf(0)).to.be.equal(users[0].address)
    expect(await this.nft.ownerOf(1)).to.be.equal(this.veWom.address)
    expect(await this.veWom.getStakedNft(users[0].address)).to.be.equal(1)

    // get ability of staked NFT
    expect(await this.nft.getWombatDetails(1)).to.be.deep.equal([0, Ability.ENDOWED, 4012345678])

    // unstake NFT
    receipt = await this.veWom.connect(users[0]).unstakeNft()
    expect(await this.nft.ownerOf(1)).to.be.equal(users[0].address)
    await expect(this.veWom.getStakedNft(users[0].address)).to.be.revertedWith('not staking')
    expect(receipt).to.emit(this.veWom, 'UnstakedNft').withArgs(users[0].address, 1)

    // Attempt to unstake again
    await expect(this.veWom.connect(users[0]).unstakeNft()).to.be.revertedWith('No NFT is staked')

    // Unsafe transfer: VeWom contract doesn't know how to handle it. NFT is permanently lost in this case
    receipt = await this.nft
      .connect(users[0])
      ['transferFrom(address,address,uint256)'](users[0].address, this.veWom.address, 0)
    expect(receipt).not.to.emit(this.veWom, 'StakedNft')
    await expect(this.veWom.getStakedNft(users[0].address)).to.be.revertedWith('not staking')

    // one needs to stake wom before depositing any nft
    await this.wom.transfer(users[1].address, parseEther('100'))
    await this.wom.connect(users[1]).approve(this.veWom.address, parseEther('100'))
    await this.veWom.connect(users[1]).deposit(parseEther('100'))
    expect(await this.veWom.isUser(users[1].address)).to.be.true

    // transfer NFT ownership and stake
    await this.nft.connect(users[0])['safeTransferFrom(address,address,uint256)'](users[0].address, users[1].address, 1)
    receipt = await this.nft
      .connect(users[1])
      ['safeTransferFrom(address,address,uint256)'](users[1].address, this.veWom.address, 1)
    expect(receipt).to.emit(this.veWom, 'StakedNft').withArgs(users[1].address, 1)
    expect(await this.veWom.getStakedNft(users[1].address)).to.be.equal(1)

    // unstake it
    await expect(this.veWom.connect(users[0]).unstakeNft()).to.be.revertedWith('No NFT is staked')
    expect(await this.veWom.connect(users[1]).unstakeNft())
      .to.emit(this.veWom, 'UnstakedNft')
      .withArgs(users[1].address, 1)

    // withdraw wom
    await this.veWom.connect(users[0]).withdraw(parseEther('100'))
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('100'))
  })
})

after(async function () {
  await network.provider.request({
    method: 'hardhat_reset',
    params: [],
  })
})
