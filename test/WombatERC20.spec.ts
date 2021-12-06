import { ethers } from 'hardhat'
import chai from 'chai'
import { parseUnits } from '@ethersproject/units'
import { Contract } from 'ethers'
import { solidity } from 'ethereum-waffle'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { signERC2612Permit } from '../contracts/wombat-peripheral/permit/eth-permit' // https://github.com/dmihal/eth-permit
import secrets from '../secrets.json' // BSC TESTNET ONLY!

chai.use(solidity)
const { expect } = chai

describe('WombatERC20', function () {
  let owner: SignerWithAddress
  let user1: SignerWithAddress
  let user2: SignerWithAddress
  let tokenContract: Contract

  beforeEach(async function () {
    const [first, ...rest] = await ethers.getSigners()
    owner = first
    user1 = rest[0]
    user2 = rest[1]

    // Get Factories
    const TestWombatERC20Factory = await ethers.getContractFactory('WombatERC20')

    // Deploy with factories
    // Default constructor setup => 'Wombat Token', 'WOM', 18, parseUnits('1000000', 18)
    tokenContract = await TestWombatERC20Factory.connect(owner).deploy(parseUnits('1000000', 18)) // 1 mil WOM

    // wait for transactions to be mined
    await tokenContract.deployTransaction.wait()
  })

  // TODO: move pool address setup within contract initialization
  describe('[initial deploy]', function () {
    it('Should return correct name', async function () {
      expect(await tokenContract.name()).to.equal('Wombat Token')
    })
    it('Should return correct symbol', async function () {
      expect(await tokenContract.symbol()).to.equal('WOM')
    })
    it('Should return correct decimals', async function () {
      expect(await tokenContract.decimals()).to.equal(18)
    })
    it('Should return correct total supply', async function () {
      expect(await tokenContract.totalSupply()).to.equal(parseUnits('1000000', 18))
    })
    it('Should return correct balance of deployer', async function () {
      expect(await tokenContract.balanceOf(owner.address)).to.equal(parseUnits('1000000', 18))
    })
  })

  describe('[transferFrom with approve]', function () {
    it('Should revert as user has not approved transferFrom', async function () {
      await expect(tokenContract.transferFrom(owner.address, user2.address, parseUnits('1000', 18))).to.be.revertedWith(
        'ERC20: transfer amount exceeds allowance'
      )
    })

    it('Should transferFrom deployer to user 1000 WOM tokens', async function () {
      // approve transferFrom deployer to user1
      await tokenContract.connect(owner).approve(user1.address, ethers.constants.MaxUint256)
      await tokenContract.connect(user1).transferFrom(owner.address, user2.address, parseUnits('1000', 18))

      // should return correct balances after
      expect(await tokenContract.balanceOf(owner.address)).to.equal(parseUnits('999000', 18))
      expect(await tokenContract.balanceOf(user2.address)).to.equal(parseUnits('1000', 18))
      expect(await tokenContract.totalSupply()).to.equal(parseUnits('1000000', 18))
    })
  })

  describe('[transferFrom with increaseAllowance]', function () {
    it('Should revert as user transferFrom above allowance', async function () {
      await tokenContract.connect(owner).increaseAllowance(user1.address, parseUnits('1000', 18))
      expect(await tokenContract.allowance(owner.address, user1.address)).to.equal(parseUnits('1000', 18))
      await expect(tokenContract.transferFrom(owner.address, user2.address, parseUnits('2000', 18))).to.be.revertedWith(
        'ERC20: transfer amount exceeds allowance'
      )
    })

    it('Should revert as user transferFrom above allowance, altered by decreaseAllowance', async function () {
      await tokenContract.connect(owner).increaseAllowance(user1.address, parseUnits('1000', 18))
      await tokenContract.connect(owner).decreaseAllowance(user1.address, parseUnits('900', 18))
      await expect(tokenContract.transferFrom(owner.address, user2.address, parseUnits('200', 18))).to.be.revertedWith(
        'ERC20: transfer amount exceeds allowance'
      )
    })

    it('Should transferFrom deployer to user 2000 WOM tokens', async function () {
      // increaseAllowance for transferFrom deployer to user1
      await tokenContract.connect(owner).increaseAllowance(user1.address, ethers.constants.MaxUint256)
      await tokenContract.connect(user1).transferFrom(owner.address, user2.address, parseUnits('1000', 18))

      // should return correct balances after
      expect(await tokenContract.balanceOf(owner.address)).to.equal(parseUnits('999000', 18))
      expect(await tokenContract.balanceOf(user2.address)).to.equal(parseUnits('1000', 18))
      expect(await tokenContract.totalSupply()).to.equal(parseUnits('1000000', 18))
    })
  })

  describe('[transferFrom with permit]', function () {
    it('Should revert as user transferFrom above permitted allowance', async function () {
      const wallet = new ethers.Wallet(secrets.deployer.privateKey, ethers.provider)
      const senderAddress = await wallet.getAddress()

      const result = await signERC2612Permit(
        wallet,
        tokenContract.address,
        senderAddress,
        user1.address,
        parseUnits('1000', 18).toString()
      )

      await tokenContract.permit(
        senderAddress,
        user1.address,
        parseUnits('1000', 18).toString(),
        result.deadline,
        result.v,
        result.r,
        result.s
      )
      expect(await tokenContract.allowance(senderAddress, user1.address)).to.equal(parseUnits('1000', 18))

      // give sender 10000 WOM tokens
      await tokenContract.connect(owner).transfer(senderAddress, parseUnits('10000', 18))
      expect(await tokenContract.balanceOf(senderAddress)).to.equal(parseUnits('10000', 18))

      // user1 transferFrom sender 2000 WOM tokens but fails as > than given allowance
      await expect(
        tokenContract.connect(user1).transferFrom(senderAddress, user2.address, parseUnits('2000', 18))
      ).to.be.revertedWith('ERC20: transfer amount exceeds allowance')
    })

    it('Should transferFrom sender to user 1000 WOM tokens', async function () {
      const wallet = new ethers.Wallet(secrets.deployer.privateKey, ethers.provider)
      const senderAddress = await wallet.getAddress()

      const result = await signERC2612Permit(
        wallet,
        tokenContract.address,
        senderAddress,
        user1.address,
        parseUnits('1000', 18).toString()
      )

      await tokenContract.permit(
        senderAddress,
        user1.address,
        parseUnits('1000', 18).toString(),
        result.deadline,
        result.v,
        result.r,
        result.s
      )
      expect(await tokenContract.allowance(senderAddress, user1.address)).to.equal(parseUnits('1000', 18))

      // give sender 10000 WOM tokens
      await tokenContract.connect(owner).transfer(senderAddress, parseUnits('10000', 18))
      expect(await tokenContract.balanceOf(senderAddress)).to.equal(parseUnits('10000', 18))

      // user1 transferFrom sender 200 WOM tokens and succeeds as < than given allowance
      await tokenContract.connect(user1).transferFrom(senderAddress, user2.address, parseUnits('200', 18))

      // should return correct balances after
      expect(await tokenContract.balanceOf(senderAddress)).to.equal(parseUnits('9800', 18))
      expect(await tokenContract.balanceOf(user2.address)).to.equal(parseUnits('200', 18))
    })
  })
})
