import { ethers } from 'hardhat'
import { parseUnits } from '@ethersproject/units'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { Contract } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const { expect } = chai

chai.use(solidity)

describe('TokenVesting', function () {
  let owner: SignerWithAddress
  let user1: SignerWithAddress
  let user2: SignerWithAddress
  let tokenContract: Contract
  let vestingContract: Contract
  let lastBlockTime: number
  let tenMonthsSince: number
  let twentyMonthsSince: number
  let fiftyMonthsSince: number
  let sixtyMonthsSince: number
  let sixMonths: number
  let startCliff: number

  // Declare initial variables
  let startTimestamp: number // start timestamp of vesting period
  let durationSeconds: number // vesting duration of the vesting period

  beforeEach(async function () {
    const [first, ...rest] = await ethers.getSigners()
    owner = first
    user1 = rest[0]
    user2 = rest[1]

    // get last block time
    const lastBlock = await ethers.provider.getBlock('latest')
    lastBlockTime = lastBlock.timestamp
    sixMonths = (60 * 60 * 24 * 365) / 2 // 15768000
    startCliff = 60 * 60 * 24 * 30 // 30 days cliff
    startTimestamp = lastBlockTime + startCliff // 30 days later, i.e. 30 days cliff
    durationSeconds = 60 * 60 * 24 * 365 * 5 // 1825 days, i.e. 5 years vesting period

    tenMonthsSince = lastBlockTime + 60 * 60 * 24 * 300 // 10 months later, i.e. _unlockIntervalsCount = 1
    twentyMonthsSince = lastBlockTime + 60 * 60 * 24 * 600 // 20 months later, i.e. _unlockIntervalsCount = 3
    fiftyMonthsSince = lastBlockTime + 60 * 60 * 24 * 1500 // 50 months later, i.e. _unlockIntervalsCount = 8
    sixtyMonthsSince = lastBlockTime + 60 * 60 * 24 * 1825 // 60 months later, i.e. _unlockIntervalsCount = 10

    // Get Factories
    const TestWombatERC20Factory = await ethers.getContractFactory('WombatERC20')
    const TestTokenVestingFactory = await ethers.getContractFactory('TestTokenVesting')

    // Deploy with factories
    tokenContract = await TestWombatERC20Factory.connect(owner).deploy(parseUnits('1000000', 18)) // 1 mil WOM
    vestingContract = await TestTokenVestingFactory.connect(owner).deploy(
      tokenContract.address,
      startTimestamp,
      durationSeconds,
      sixMonths
    )

    // wait for transactions to be mined
    await tokenContract.deployTransaction.wait()
    await vestingContract.deployTransaction.wait()
  })

  describe('[initial deploy]', function () {
    it('Should return correct start timestamp', async function () {
      expect(await vestingContract.start()).to.equal(startTimestamp)
    })
    it('Should return correct vesting duration', async function () {
      expect(await vestingContract.duration()).to.equal(durationSeconds)
    })
    it('Should return 0 underlying WOM token balance', async function () {
      expect(await vestingContract.totalUnderlyingBalance()).to.equal(0)
    })
    it('Should return 0 beneficiary count', async function () {
      expect(await vestingContract.beneficiaryCount()).to.equal(0)
    })
    it('Should return 0 total allocation balance', async function () {
      expect(await vestingContract.totalAllocationBalance()).to.equal(0)
    })
    it('Should return 0 released amount for user1', async function () {
      expect(await vestingContract.released(user1.address)).to.equal(0)
    })
    it('Should return 0 vested amount for user1', async function () {
      expect(await vestingContract.callStatic.vestedAmount(user1.address, tenMonthsSince)).to.equal(0)
    })
  })

  describe('[setBeneficiary]', function () {
    it('Should set new beneficiary address with allocation amount', async function () {
      expect(await vestingContract.connect(owner).setBeneficiary(user1.address, 10000))
        .to.emit(vestingContract, 'BeneficiaryAdded')
        .withArgs(user1.address, 10000)

      expect(await vestingContract.beneficiaryCount()).to.equal(1)
      expect(await vestingContract.beneficiaryBalance(user1.address)).to.equal(10000)
      expect(await vestingContract.totalAllocationBalance()).to.equal(10000)
    })
    it('Should set 2 new beneficiary address with allocation amount', async function () {
      expect(await vestingContract.connect(owner).setBeneficiary(user1.address, 10000))
        .to.emit(vestingContract, 'BeneficiaryAdded')
        .withArgs(user1.address, 10000)

      expect(await vestingContract.connect(owner).setBeneficiary(user2.address, 22000))
        .to.emit(vestingContract, 'BeneficiaryAdded')
        .withArgs(user2.address, 22000)

      expect(await vestingContract.beneficiaryCount()).to.equal(2)
      expect(await vestingContract.beneficiaryBalance(user1.address)).to.equal(10000)
      expect(await vestingContract.beneficiaryBalance(user2.address)).to.equal(22000)
      expect(await vestingContract.totalAllocationBalance()).to.equal(32000)
    })
    it('Should revert set new beneficiary address if already set', async function () {
      await vestingContract.connect(owner).setBeneficiary(user1.address, 10000)
      await expect(vestingContract.connect(owner).setBeneficiary(user1.address, 20000)).to.be.revertedWith(
        'Beneficiary: allocation already set'
      )
    })
    it('Should revert set new beneficiary address if not called by owner', async function () {
      await expect(vestingContract.connect(user1).setBeneficiary(user1.address, 10000)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })
  })

  describe('[vestedAmount]', function () {
    it('Should calculate the correct amount of vested WOM tokens for a beneficiary', async function () {
      // set user1 as beneficiary with 10000 WOM allocation
      const setBeneficiaryTx = await vestingContract
        .connect(owner)
        .setBeneficiary(user1.address, parseUnits('10000', 18))
      await setBeneficiaryTx.wait()

      // transfer 10000 WOM tokens to vesting contract
      const transferTx = await tokenContract.connect(owner).transfer(vestingContract.address, parseUnits('10000', 18))
      await transferTx.wait()

      expect(await vestingContract.totalUnderlyingBalance()).to.equal(parseUnits('10000', 18))
      expect(await vestingContract.beneficiaryBalance(user1.address)).to.equal(parseUnits('10000', 18))
      expect(await vestingContract.released(user1.address)).to.equal(0)

      // _unlockIntervalsCount = 0, unlocks 0% out of 10000 WOM allocation, hence 0 WOM tokens vested
      expect(await vestingContract.callStatic.vestedAmount(user1.address, startTimestamp)).to.equal(0)

      // _unlockIntervalsCount = 1, unlocks 10% out of 10000 WOM allocation, hence 1000 WOM tokens vested
      expect(await vestingContract.callStatic.vestedAmount(user1.address, tenMonthsSince)).to.equal(
        parseUnits('1000', 18)
      )

      // _unlockIntervalsCount = 3, unlocks 30% out of 10000 WOM allocation
      expect(await vestingContract.callStatic.vestedAmount(user1.address, twentyMonthsSince)).to.equal(
        parseUnits('3000', 18)
      )

      // _unlockIntervalsCount = 8, unlocks 80% out of 10000 WOM allocation
      expect(await vestingContract.callStatic.vestedAmount(user1.address, fiftyMonthsSince)).to.equal(
        parseUnits('8000', 18)
      )

      // _unlockIntervalsCount = 10, unlocks 100% out of 10000 WOM allocation
      expect(await vestingContract.callStatic.vestedAmount(user1.address, sixtyMonthsSince + startCliff)).to.equal(
        parseUnits('10000', 18)
      )

      // _unlockIntervalsCount = 10, unlocks 100% out of 10000 WOM allocation, after 10 years
      expect(await vestingContract.callStatic.vestedAmount(user1.address, sixtyMonthsSince + durationSeconds)).to.equal(
        parseUnits('10000', 18)
      )
    })
    it('Should calculate the correct 8 decimal amounts of vested WOM tokens for a beneficiary', async function () {
      // set user1 as beneficiary with 1000.12345678 WOM allocation
      await vestingContract.connect(owner).setBeneficiary(user1.address, parseUnits('1000.12345678', 18))

      // transfer 1001 WOM tokens to vesting contract
      await tokenContract.connect(owner).transfer(vestingContract.address, parseUnits('1001', 18))

      expect(await vestingContract.totalUnderlyingBalance()).to.equal(parseUnits('1001', 18))
      expect(await vestingContract.beneficiaryBalance(user1.address)).to.equal(parseUnits('1000.12345678', 18))
      expect(await vestingContract.released(user1.address)).to.equal(0)

      // _unlockIntervalsCount = 0, unlocks 0% out of 1000.12345678 WOM allocation, hence 0 WOM tokens vested
      expect(await vestingContract.callStatic.vestedAmount(user1.address, startTimestamp)).to.equal(0)

      // _unlockIntervalsCount = 1, unlocks 10% out of 1000.12345678 WOM allocation, hence 1000 WOM tokens vested
      expect(await vestingContract.callStatic.vestedAmount(user1.address, tenMonthsSince)).to.equal(
        parseUnits('100.012345678', 18)
      )

      // _unlockIntervalsCount = 3, unlocks 30% out of 1000.12345678 WOM allocation
      expect(await vestingContract.callStatic.vestedAmount(user1.address, twentyMonthsSince)).to.equal(
        parseUnits('300.037037034', 18)
      )

      // _unlockIntervalsCount = 8, unlocks 80% out of 1000.12345678 WOM allocation
      expect(await vestingContract.callStatic.vestedAmount(user1.address, fiftyMonthsSince)).to.equal(
        parseUnits('800.098765424', 18)
      )

      // _unlockIntervalsCount = 10, unlocks 100% out of 1000.12345678 WOM allocation
      expect(await vestingContract.callStatic.vestedAmount(user1.address, sixtyMonthsSince + startCliff)).to.equal(
        parseUnits('1000.12345678', 18)
      )

      // _unlockIntervalsCount = 10, unlocks 100% out of 1000.12345678 WOM allocation, after 10 years
      expect(await vestingContract.callStatic.vestedAmount(user1.address, sixtyMonthsSince + durationSeconds)).to.equal(
        parseUnits('1000.12345678', 18)
      )
    })
    it('Should increment correct unlock interval count and transfer correct amount of vested WOM tokens', async function () {
      // set user1 as beneficiary with 10000 WOM allocation
      await vestingContract.connect(owner).setBeneficiary(user1.address, parseUnits('10000', 18))

      // transfer 10000 WOM tokens to vesting contract
      await tokenContract.connect(owner).transfer(vestingContract.address, parseUnits('10000', 18))

      expect(await vestingContract.totalUnderlyingBalance()).to.equal(parseUnits('10000', 18))
      expect(await vestingContract.beneficiaryBalance(user1.address)).to.equal(parseUnits('10000', 18))
      expect(await vestingContract.released(user1.address)).to.equal(0)

      const blockNumBefore = await ethers.provider.getBlockNumber()
      const blockBefore = await ethers.provider.getBlock(blockNumBefore)
      const timestampBefore = blockBefore.timestamp

      await ethers.provider.send('evm_increaseTime', [startCliff * 10]) // fast forward 10 months
      await ethers.provider.send('evm_mine', [])

      const blockNumAfter = await ethers.provider.getBlockNumber()
      const blockAfter = await ethers.provider.getBlock(blockNumAfter)
      const timestampAfter = blockAfter.timestamp

      expect(blockNumAfter).to.be.equal(blockNumBefore + 1)
      expect(timestampAfter).to.be.equal(timestampBefore + startCliff * 10)

      // _unlockIntervalsCount = 1, unlocks 10% out of 10000 WOM allocation, receives 1000 WOM
      expect(await vestingContract.release(user1.address))
        .to.emit(vestingContract, 'ERC20Released')
        .withArgs(tokenContract.address, parseUnits('1000', 18))

      expect(await vestingContract.released(user1.address)).to.equal(parseUnits('1000', 18))
      expect(await tokenContract.balanceOf(user1.address)).to.equal(parseUnits('1000', 18))
      expect(await vestingContract.totalUnderlyingBalance()).to.equal(parseUnits('9000', 18))

      await ethers.provider.send('evm_increaseTime', [startCliff * 40]) // fast forward 40 months more
      await ethers.provider.send('evm_mine', [])

      // _unlockIntervalsCount = 8, unlocks 80% out of 10000 WOM allocation, receives 7000 more WOM
      expect(await vestingContract.release(user1.address))
        .to.emit(vestingContract, 'ERC20Released')
        .withArgs(tokenContract.address, parseUnits('7000', 18))

      expect(await vestingContract.released(user1.address)).to.equal(parseUnits('8000', 18))
      expect(await tokenContract.balanceOf(user1.address)).to.equal(parseUnits('8000', 18))
      expect(await vestingContract.totalUnderlyingBalance()).to.equal(parseUnits('2000', 18))

      await ethers.provider.send('evm_increaseTime', [startCliff * 20]) // fast forward 20 months more
      await ethers.provider.send('evm_mine', [])

      // timestamp > start() + duration(), unlocks 100% out of 10000 WOM allocation, receives 2000 more WOM
      expect(await vestingContract.release(user1.address))
        .to.emit(vestingContract, 'ERC20Released')
        .withArgs(tokenContract.address, parseUnits('2000', 18))

      expect(await vestingContract.released(user1.address)).to.equal(parseUnits('10000', 18))
      expect(await tokenContract.balanceOf(user1.address)).to.equal(parseUnits('10000', 18))
      expect(await vestingContract.totalUnderlyingBalance()).to.equal(0)
    })
    it('Should transfer correct amount of vested WOM tokens for 2 new beneficiary address after multiple interval counts', async function () {
      await vestingContract.connect(owner).setBeneficiary(user1.address, parseUnits('10000', 18))
      await vestingContract.connect(owner).setBeneficiary(user2.address, parseUnits('1000.12345678', 18))

      // transfer 11001 WOM tokens to vesting contract
      await tokenContract.connect(owner).transfer(vestingContract.address, parseUnits('11001', 18))

      await ethers.provider.send('evm_increaseTime', [startCliff * 20]) // fast forward 20 months, 3rd interval count
      await ethers.provider.send('evm_mine', [])

      const blockNumAfter = await ethers.provider.getBlockNumber()
      await ethers.provider.getBlock(blockNumAfter)

      // _unlockIntervalsCount = 3, unlocks total 30% out of 11001 WOM allocation,
      // user 1 receives 3000 WOM
      // user 2 receives 300.037037034 WOM
      expect(await vestingContract.release(user1.address))
        .to.emit(vestingContract, 'ERC20Released')
        .withArgs(tokenContract.address, parseUnits('3000', 18))

      expect(await vestingContract.released(user1.address)).to.equal(parseUnits('3000', 18))
      expect(await tokenContract.balanceOf(user1.address)).to.equal(parseUnits('3000', 18))
      expect(await vestingContract.beneficiaryBalance(user1.address)).to.equal(parseUnits('7000', 18))
      // 11001 - 3000
      expect(await vestingContract.totalUnderlyingBalance()).to.equal(parseUnits('8001', 18))

      expect(await vestingContract.release(user2.address))
        .to.emit(vestingContract, 'ERC20Released')
        .withArgs(tokenContract.address, parseUnits('300.037037034', 18))

      expect(await vestingContract.released(user2.address)).to.equal(parseUnits('300.037037034', 18))
      expect(await tokenContract.balanceOf(user2.address)).to.equal(parseUnits('300.037037034', 18))
      // 1000.12345678 - 300.037037034
      expect(await vestingContract.beneficiaryBalance(user2.address)).to.equal(parseUnits('700.086419746', 18))
      // 8001 - 300.037037034
      expect(await vestingContract.totalUnderlyingBalance()).to.equal(parseUnits('7700.962962966', 18))

      await ethers.provider.send('evm_increaseTime', [startCliff * 30]) // fast forward 40 months more
      await ethers.provider.send('evm_mine', [])

      // _unlockIntervalsCount = 8, unlocks total 80% out of 11001 WOM allocation,
      // user 1 receives 5000 WOM
      // user 2 receives 500.0617283900 WOM
      expect(await vestingContract.release(user1.address))
        .to.emit(vestingContract, 'ERC20Released')
        .withArgs(tokenContract.address, parseUnits('5000', 18))

      expect(await vestingContract.released(user1.address)).to.equal(parseUnits('8000', 18))
      expect(await tokenContract.balanceOf(user1.address)).to.equal(parseUnits('8000', 18))
      expect(await vestingContract.beneficiaryBalance(user1.address)).to.equal(parseUnits('2000', 18))
      // 7700.962962966 - 5000
      expect(await vestingContract.totalUnderlyingBalance()).to.equal(parseUnits('2700.962962966', 18))

      expect(await vestingContract.release(user2.address))
        .to.emit(vestingContract, 'ERC20Released')
        .withArgs(tokenContract.address, parseUnits('500.0617283900', 18))

      // 300.037037034 + 500.0617283900
      expect(await vestingContract.released(user2.address)).to.equal(parseUnits('800.098765424', 18))
      expect(await tokenContract.balanceOf(user2.address)).to.equal(parseUnits('800.098765424', 18))
      // 1000.12345678 - 800.098765424
      expect(await vestingContract.beneficiaryBalance(user2.address)).to.equal(parseUnits('200.024691356', 18))
      // 2700.9629629660003 - 500.0617283900
      expect(await vestingContract.totalUnderlyingBalance()).to.equal(parseUnits('2200.901234576', 18))
    })
    it('Should not return any amount of vested WOM tokens if claim before cliff', async function () {
      // set user1 as beneficiary with 10000 WOM allocation
      await vestingContract.connect(owner).setBeneficiary(user1.address, parseUnits('10000', 18))

      // transfer 10000 WOM tokens to vesting contract
      await tokenContract.connect(owner).transfer(vestingContract.address, parseUnits('10000', 18))

      // should release 0 WOM tokens as 0 vested amount
      expect(await vestingContract.release(user1.address))
        .to.emit(vestingContract, 'ERC20Released')
        .withArgs(tokenContract.address, 0)

      expect(await vestingContract.released(user1.address)).to.equal(0)
      expect(await tokenContract.balanceOf(user1.address)).to.equal(0)
    })
  })
})
