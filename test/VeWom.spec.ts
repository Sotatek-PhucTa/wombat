import { toUtf8Bytes } from '@ethersproject/strings'
import { parseEther } from '@ethersproject/units'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import chai, { expect } from 'chai'

import { ethers, network } from 'hardhat'
import { near } from './assertions/near'
import { advanceTimeAndBlock, latest } from './helpers'
import { Ability } from './helpers/nft'

chai.use(near)

describe('VeWOM', function () {
  let owner: SignerWithAddress
  let users: SignerWithAddress[]

  before(async function () {
    this.signers = await ethers.getSigners()

    const [first, ...rest] = await ethers.getSigners()
    owner = first
    users = rest

    this.MasterWombat = await ethers.getContractFactory('MasterWombatV2')
    this.MockAttacker = await ethers.getContractFactory('MockAttacker')
    this.Whitelist = await ethers.getContractFactory('Whitelist')
    this.Wom = await ethers.getContractFactory('WombatERC20')
    this.VeWom = await ethers.getContractFactory('VeWom')
    this.MockERC20 = await ethers.getContractFactory('MockERC20')

    this.womPerSec = parseEther('0.9259259259259259')

    this.reward = (sec: number, percent: number) => {
      return (sec * this.womPerSec * percent) / 1000
    }
  })

  beforeEach(async function () {
    const startTime = (await latest()).add(60)

    this.wom = await this.Wom.connect(owner).deploy(owner.address, parseEther('1000000000')) // 1 bil WOM tokens
    this.veWom = await this.VeWom.deploy()
    await this.veWom.deployed()

    this.mWom = await this.MasterWombat.deploy()
    await this.mWom.connect(owner).initialize(this.wom.address, this.veWom.address, this.womPerSec, 1000, startTime)

    await this.mWom.deployed()
    this.veWom.initialize(this.wom.address, this.mWom.address)
  })

  it('should set correct name and symbol', async function () {
    expect(await this.veWom.name()).to.be.equal('Wombat Waddle')
    expect(await this.veWom.symbol()).to.be.equal('veWOM')
    expect(await this.veWom.decimals()).to.be.equal(18)
    expect(await this.veWom.totalSupply()).to.be.equal(0)
  })

  it('should set MasterWombat correctly', async function () {
    await this.veWom.setMasterWombat(users[1].address)
    expect(await this.veWom.masterWombat()).to.be.equal(users[1].address)

    await expect(this.veWom.setMasterWombat(ethers.constants.AddressZero)).to.be.reverted
  })

  it.skip('should set NFT correctly', async function () {
    // first expect to revert if called from not owner
    await expect(this.veWom.connect(users[1]).setNftAddress(users[10].address)).to.be.revertedWith(
      'Ownable: caller is not the owner'
    )

    await expect(this.veWom.setNftAddress(ethers.constants.AddressZero)).to.be.revertedWith('zero address')

    // then set nft address
    await this.veWom.setNftAddress(users[10].address)
    expect(await this.veWom.nft()).to.be.equal(users[10].address)
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

  it.skip('should not allow deposit if not enough approve', async function () {
    await expect(this.veWom.deposit('100')).to.be.revertedWith('ERC20: transfer amount exceeds allowance')
    await this.wom.approve(this.veWom.address, '50')
    await expect(this.veWom.deposit('100')).to.be.revertedWith('ERC20: transfer amount exceeds allowance')

    const beforeWomBalance = await this.wom.balanceOf(owner.address)
    await this.wom.approve(this.veWom.address, '100')
    await this.veWom.deposit('100')

    const afterWomBalance = await this.wom.balanceOf(owner.address)
    expect(afterWomBalance.sub(beforeWomBalance)).to.equal(-100)
  })

  it('should not allow mint from smart contract unless whitelisted', async function () {
    // try to attack by minting from a contract
    this.mockAttacker = await this.MockAttacker.deploy(this.wom.address, this.veWom.address)
    await this.mockAttacker.approve(100)
    await this.wom.transfer(this.mockAttacker.address, 100)
    await expect(this.mockAttacker.mint(100, 7)).to.be.revertedWith('Smart contract depositors not allowed')

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

    // mint via mockAttacker
    await expect(this.mockAttacker.mint(100, 7)).to.not.reverted

    // should also revoke wallet approriately
    await this.whitelist.revokeWallet(this.mockAttacker.address)
    await expect(this.mockAttacker.mint(100, 7)).to.be.revertedWith('Smart contract depositors not allowed')
  })

  it('lock day should be valid', async function () {
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(0)
    // mint 100 WOM
    await this.wom.connect(owner).transfer(users[0].address, parseEther('100'))
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('100'))
    await this.wom.connect(users[0]).approve(this.veWom.address, parseEther('100'))

    await expect(this.veWom.connect(users[0]).mint(parseEther('10'), 6)).to.be.revertedWith('lock days is invalid')
    await expect(this.veWom.connect(users[0]).mint(parseEther('10'), 1462)).to.be.revertedWith('lock days is invalid')
  })

  it('should allow minting multiple times with different length', async function () {
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(0)
    // mint 100 WOM
    await this.wom.connect(owner).transfer(users[0].address, parseEther('100'))
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('100'))
    await this.wom.connect(users[0]).approve(this.veWom.address, parseEther('100'))

    await this.veWom.connect(users[0]).mint(parseEther('10'), 14)
    expect(await this.veWom.connect(users[0]).balanceOf(users[0].address)).to.equal(parseEther('0.978901310396626401'))
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('90'))

    await this.veWom.connect(users[0]).mint(parseEther('1'), 1000)
    expect(await this.veWom.connect(users[0]).balanceOf(users[0].address)).to.equal(parseEther('1.806223917837655463'))
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('89'))

    await this.veWom.connect(users[0]).mint(parseEther('10'), 7)
    expect(await this.veWom.connect(users[0]).balanceOf(users[0].address)).to.equal(parseEther('2.498411672531507406'))
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('79'))
  })

  it('lock 7 days', async function () {
    // mint 100 WOM
    await this.wom.connect(owner).transfer(users[0].address, parseEther('100'))
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('100'))
    await this.wom.connect(users[0]).approve(this.veWom.address, parseEther('100'))

    await this.veWom.connect(users[0]).mint(parseEther('100'), 7)
    expect(await this.veWom.connect(users[0]).balanceOf(users[0].address)).to.equal(parseEther('6.921877546938519430'))
  })

  it('lock 1 years', async function () {
    // mint 100 WOM
    await this.wom.connect(owner).transfer(users[0].address, parseEther('100'))
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('100'))
    await this.wom.connect(users[0]).approve(this.veWom.address, parseEther('100'))

    await this.veWom.connect(users[0]).mint(parseEther('100'), 365)
    expect(await this.veWom.connect(users[0]).balanceOf(users[0].address)).to.equal(parseEther('49.982885503520444767'))
  })

  it('lock 4 years', async function () {
    // mint 100 WOM
    await this.wom.connect(owner).transfer(users[0].address, parseEther('100'))
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('100'))
    await this.wom.connect(users[0]).approve(this.veWom.address, parseEther('100'))

    await this.veWom.connect(users[0]).mint(parseEther('100'), 1461)
    expect(await this.veWom.connect(users[0]).balanceOf(users[0].address)).to.equal(parseEther('99.999999999999835750'))
  })

  it('should respect maxBreedingLength', async function () {
    // mint 100 WOM
    await this.wom.connect(owner).transfer(users[0].address, parseEther('100'))
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('100'))
    await this.wom.connect(users[0]).approve(this.veWom.address, parseEther('100'))

    // set max length to 10
    await this.veWom.connect(owner).setMaxBreedingLength(10)

    for (let i = 0; i < 10; i++) {
      await this.veWom.connect(users[0]).mint(parseEther('1'), 7)
    }

    await expect(this.veWom.connect(users[0]).mint(parseEther('1'), 7)).to.be.revertedWith('breed too much')
  })

  it('burn should work', async function () {
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(0)
    // mint 100 WOM
    await this.wom.connect(owner).transfer(users[0].address, parseEther('100'))
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('100'))
    await this.wom.connect(users[0]).approve(this.veWom.address, parseEther('100'))

    await this.veWom.connect(users[0]).mint(parseEther('10'), 7)
    await this.veWom.connect(users[0]).mint(parseEther('20'), 7)
    await this.veWom.connect(users[0]).mint(parseEther('5'), 7)
    expect(await this.veWom.connect(users[0]).balanceOf(users[0].address)).to.equal(parseEther('2.422657141428481800'))
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('65'))

    const secondsInDay = 86400
    advanceTimeAndBlock(secondsInDay * 7)

    // balance should be the same after expiry
    expect(await this.veWom.connect(users[0]).balanceOf(users[0].address)).to.equal(parseEther('2.422657141428481800'))

    await this.veWom.connect(users[0]).burn(0)
    expect(await this.veWom.connect(users[0]).balanceOf(users[0].address)).to.equal(parseEther('1.730469386734629857'))
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('75'))

    await this.veWom.connect(users[0]).burn(1)
    expect(await this.veWom.connect(users[0]).balanceOf(users[0].address)).to.equal(parseEther('0.346093877346925971'))
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('95'))

    await this.veWom.connect(users[0]).burn(0)
    expect(await this.veWom.connect(users[0]).balanceOf(users[0].address)).to.equal(parseEther('0')) // should equal to 0 exactly
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('100'))

    await expect(this.veWom.connect(users[0]).burn(0)).to.be.revertedWith('wut?')
  })

  it('burn should reject if time not reached yet', async function () {
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(0)
    // mint 100 WOM
    await this.wom.connect(owner).transfer(users[0].address, parseEther('100'))
    expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('100'))
    await this.wom.connect(users[0]).approve(this.veWom.address, parseEther('100'))

    await this.veWom.connect(users[0]).mint(parseEther('10'), 10)

    const secondsInDay = 86400
    advanceTimeAndBlock(secondsInDay * 9)

    await expect(this.veWom.connect(users[0]).burn(0)).to.be.revertedWith('not yet meh')

    advanceTimeAndBlock(secondsInDay * 1)
    await this.veWom.connect(users[0]).burn(0)
  })

  it('getUserOverview', async function () {
    await this.wom.connect(owner).transfer(users[0].address, parseEther('100'))
    await this.wom.connect(users[0]).approve(this.veWom.address, parseEther('100'))

    await this.veWom.connect(users[0]).mint(parseEther('10'), 10)
    await this.veWom.connect(users[0]).mint(parseEther('10'), 10)
    const overview = await this.veWom.getUserOverview(users[0].address)
    expect(overview.womLocked).to.eq(parseEther('20'))
    expect(overview.veWomBalance).to.near(parseEther('1.654'))
  })

  context('update', function () {
    beforeEach(async function () {
      expect(await this.wom.balanceOf(users[0].address)).to.be.equal(0)
      // mint 100 WOM
      await this.wom.connect(owner).transfer(users[0].address, parseEther('100'))
      expect(await this.wom.balanceOf(users[0].address)).to.be.equal(parseEther('100'))
      await this.wom.connect(users[0]).approve(this.veWom.address, parseEther('100'))
    })

    it('should work if new lockDays > original lockDays', async function () {
      // lock 7 days
      await this.veWom.connect(users[0]).mint(parseEther('100'), 7)
      expect(await this.veWom.connect(users[0]).balanceOf(users[0].address)).to.be.equal(
        parseEther('6.921877546938519430')
      )

      // update slot 0's lockDays to 365 days
      await this.veWom.connect(users[0]).update(0, 365)
      expect(await this.veWom.connect(users[0]).balanceOf(users[0].address)).to.equal(
        parseEther('49.982885503520444767')
      )
    })

    it('should reject if new lockDays < original lockDays', async function () {
      // lock 365 days
      await this.veWom.connect(users[0]).mint(parseEther('100'), 365)

      // update slot 0's lockDays to 7 days
      await expect(this.veWom.connect(users[0]).update(0, 7)).to.be.revertedWith(
        'the new end date must be greater than existing end date'
      )
    })

    it('should reject if new lockDays = original lockDays', async function () {
      // lock 365 days
      await this.veWom.connect(users[0]).mint(parseEther('100'), 365)

      // update slot 0's lockDays to 365 days (unchanged)
      await expect(this.veWom.connect(users[0]).update(0, 365)).to.be.revertedWith(
        'the new veWom amount must be greater than existing veWom amount'
      )
    })

    it('update should reject if having invalid lockdays', async function () {
      // lock 7 days
      await this.veWom.connect(users[0]).mint(parseEther('100'), 365)

      // invalid lock days (4 days)
      await expect(this.veWom.connect(users[0]).update(0, 4)).to.be.revertedWith('lock days is invalid')

      // invalid lock days (2000 days)
      await expect(this.veWom.connect(users[0]).update(0, 2000)).to.be.revertedWith('lock days is invalid')
    })
  })

  it.skip('cannot stake nft if user has no wom staked', async function () {
    await this.nft.connect(users[8]).mint(Ability.DILIGENT, 30, 24, 4, 4, 4, 4, 4, 4)
    expect(await this.veWom.isUser(users[8].address)).to.be.false

    await expect(
      this.nft.connect(users[8])['safeTransferFrom(address,address,uint256)'](users[8].address, this.veWom.address, 0)
    ).to.be.revertedWith('user has no stake')
  })

  it.skip('stakes nft', async function () {
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
