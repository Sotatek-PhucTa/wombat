import { parseEther, parseUnits } from '@ethersproject/units'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import chai from 'chai'

import { Contract, ContractFactory } from 'ethers'
import { ethers } from 'hardhat'
import { latest } from '../helpers'
import { CrossChainPool__factory } from '../../build/typechain'

const { expect } = chai

describe('Pool - Deposit', function () {
  let owner: SignerWithAddress
  let user1: SignerWithAddress
  let user2: SignerWithAddress
  let AssetFactory: ContractFactory
  let TestERC20Factory: ContractFactory
  let PoolFactory: ContractFactory
  let MasterWombatFactory: ContractFactory
  let poolContract: Contract
  let token0: Contract // BUSD
  let token1: Contract // USDC
  let token2: Contract // CAKE
  let asset0: Contract // BUSD LP
  let asset1: Contract // USDC LP
  let asset2: Contract // CAKE LP
  let masterWombat: Contract
  let wom: Contract
  let veWom: Contract
  let lastBlockTime: number
  let fiveSecondsSince: number
  let fiveSecondsAgo: number

  before(async function () {
    const [first, ...rest] = await ethers.getSigners()
    owner = first
    user1 = rest[0]
    user2 = rest[1]

    // Get Factories
    AssetFactory = await ethers.getContractFactory('Asset')
    TestERC20Factory = await ethers.getContractFactory('TestERC20')
    const CoreV3Factory = await ethers.getContractFactory('CoreV3')
    const coreV3 = await CoreV3Factory.deploy()
    PoolFactory = (await ethers.getContractFactory('PoolV3', {
      libraries: { CoreV3: coreV3.address },
    })) as CrossChainPool__factory
    MasterWombatFactory = await ethers.getContractFactory('MasterWombatV2')
  })

  beforeEach(async function () {
    // get last block time
    const lastBlock = await ethers.provider.getBlock('latest')
    lastBlockTime = lastBlock.timestamp
    fiveSecondsSince = lastBlockTime + 5 * 1000
    fiveSecondsAgo = lastBlockTime - 5 * 1000

    // Deploy with factories
    token0 = await TestERC20Factory.deploy('Binance USD', 'BUSD', 18, parseUnits('1000000', 18)) // 1 mil BUSD
    token1 = await TestERC20Factory.deploy('Venus USDC', 'vUSDC', 8, parseUnits('10000000', 8)) // 10 mil vUSDC
    token2 = await TestERC20Factory.deploy('PancakeSwap Token', 'CAKE', 18, parseUnits('1000000', 18)) // 1 mil CAKE
    asset0 = await AssetFactory.deploy(token0.address, 'Binance USD LP', 'BUSD-LP')
    asset1 = await AssetFactory.deploy(token1.address, 'Venus USDC LP', 'vUSDC-LP')
    asset2 = await AssetFactory.deploy(token2.address, 'PancakeSwap Token LP', 'CAKE-LP')
    poolContract = await PoolFactory.connect(owner).deploy()

    // set pool address
    await asset0.setPool(poolContract.address)
    await asset1.setPool(poolContract.address)
    await asset2.setPool(poolContract.address)

    // initialize pool contract
    await poolContract.connect(owner).initialize(parseEther('0.05'), parseEther('0.0004'))

    // Add BUSD & USDC assets to pool
    await poolContract.connect(owner).addAsset(token0.address, asset0.address)
    await poolContract.connect(owner).addAsset(token1.address, asset1.address)
    await poolContract.connect(owner).addAsset(token2.address, asset2.address)
  })

  describe('Asset BUSD (18 decimals)', function () {
    beforeEach(async function () {
      // Transfer 100k from BUSD contract to users
      await token0.connect(owner).transfer(user1.address, parseEther('100000')) // 100 k
      await token0.connect(owner).transfer(user2.address, parseEther('600.123'))
      // Approve max allowance from users to pool
      await token0.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await token0.connect(user2).approve(poolContract.address, ethers.constants.MaxUint256)
    })

    describe('quotePotentialDeposit', function () {
      it('works', async function () {
        const [liquidity, reward] = await poolContract.quotePotentialDeposit(token0.address, parseEther('100'))
        expect(liquidity).to.be.equal(parseEther('100'))
        expect(reward).to.be.equal(0)
      })
    })

    describe('deposit', function () {
      it('works (first LP)', async function () {
        // Get BUSD balance of user1
        const beforeBalance = await token0.balanceOf(user1.address)
        // user1 deposits 100 BUSD to pool contract
        const receipt = await poolContract
          .connect(user1)
          .deposit(token0.address, parseEther('100'), 0, user1.address, fiveSecondsSince, false)
        const afterBalance = await token0.balanceOf(user1.address)

        expect(await asset0.cash()).to.be.equal(parseEther('100'))
        expect(await asset0.liability()).to.be.equal(parseEther('100'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('100'))
        expect(await asset0.balanceOf(user1.address)).to.be.equal(parseEther('100'))
        expect(await asset0.totalSupply()).to.be.equal(parseEther('100'))
        expect(afterBalance).to.be.equal(parseEther('99900')) // 100k - 100
        expect(afterBalance.sub(beforeBalance)).to.be.equal(parseEther('-100')) // 100k - 99.9k

        await expect(receipt)
          .to.emit(poolContract, 'Deposit')
          .withArgs(user1.address, token0.address, parseEther('100'), parseEther('100'), user1.address)
      })

      it('works (second LP)', async function () {
        // user1 deposits 100 BUSD to pool contract
        const beforeBalance1 = await token0.balanceOf(user1.address)
        await poolContract
          .connect(user1)
          .deposit(token0.address, parseEther('100'), 0, user1.address, fiveSecondsSince, false)
        // user2 deposits 100.123 BUSD to pool contract
        const beforeBalance2 = await token0.balanceOf(user2.address)
        await poolContract
          .connect(user2)
          .deposit(token0.address, parseEther('100.123'), 0, user2.address, fiveSecondsSince, false)
        const afterBalance1 = await token0.balanceOf(user1.address)
        const afterBalance2 = await token0.balanceOf(user2.address)

        expect(await asset0.cash()).to.be.equal(parseEther('200.123'))
        expect(await asset0.liability()).to.be.equal(parseEther('200.123'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('200.123'))
        expect(await asset0.balanceOf(user2.address)).to.be.equal(parseEther('100.123'))
        expect(await asset0.totalSupply()).to.be.equal(parseEther('200.123'))

        expect(afterBalance1).to.be.equal(parseEther('99900')) // 100k - 100
        expect(afterBalance1.sub(beforeBalance1)).to.be.equal(parseEther('-100')) // 99.9 - 100k
        expect(afterBalance2).to.be.equal(parseEther('500')) // 600.123 - 100.123
        expect(afterBalance2.sub(beforeBalance2)).to.be.equal(parseEther('-100.123')) // 500 - 600.123
      })

      it('maintains the LP token supply and liability ratio', async function () {
        // user1 deposits 100 BUSD to pool contract
        await poolContract
          .connect(user1)
          .deposit(token0.address, parseEther('100'), 0, user1.address, fiveSecondsSince, false)
        // Add liability (from owner account)
        await asset0.connect(owner).setPool(owner.address)
        await asset0.connect(owner).addLiability(parseEther('1.768743776499783944'))
        // Reset pool to real pool address
        await asset0.connect(owner).setPool(poolContract.address)

        const receipt = await poolContract
          .connect(user1)
          .deposit(token0.address, parseEther('100'), 0, user2.address, fiveSecondsSince, false)

        expect(await asset0.liability()).to.be.equal(parseEther('201.769488019652669444'))
        expect(await asset0.balanceOf(user2.address)).to.be.equal(parseEther('98.262728350828713840'))
        expect(await asset0.totalSupply()).to.be.equal(parseEther('198.262728350828713840'))
        expect((await asset0.liability()) / (await asset0.totalSupply())).to.equal(1.0176874377649978)

        await expect(receipt)
          .to.emit(poolContract, 'Deposit')
          .withArgs(
            user1.address,
            token0.address,
            parseEther('100'),
            parseEther('98.262728350828713840'),
            user2.address
          )
      })

      it('reverts if passed deadline', async function () {
        await expect(
          poolContract
            .connect(user1)
            .deposit(token0.address, parseEther('100'), 0, user1.address, fiveSecondsAgo, false)
        ).to.be.revertedWithCustomError(poolContract, 'WOMBAT_EXPIRED')
      })

      it('reverts if liquidity to mint is too small', async function () {
        await expect(
          poolContract
            .connect(user1)
            .deposit(token0.address, parseEther('0'), 0, user1.address, fiveSecondsSince, false)
        ).to.be.revertedWithCustomError(poolContract, 'WOMBAT_ZERO_AMOUNT')
      })

      it('reverts if liquidity provider does not have enough balance', async function () {
        await expect(
          poolContract
            .connect(user2)
            .deposit(token0.address, parseEther('1000.123'), 0, user2.address, fiveSecondsSince, false)
        ).to.be.revertedWith('ERC20: transfer amount exceeds balance')
      })

      it('reverts if pool paused', async function () {
        await poolContract.connect(owner).pause()
        await expect(
          poolContract
            .connect(user1)
            .deposit(token0.address, parseEther('100'), 0, user1.address, fiveSecondsSince, false)
        ).to.be.revertedWith('Pausable: paused')
      })

      it('reverts if asset paused', async function () {
        await poolContract.connect(owner).pauseAsset(token0.address)
        await expect(
          poolContract
            .connect(user1)
            .deposit(token0.address, parseEther('100'), 0, user1.address, fiveSecondsSince, false)
        ).to.be.revertedWithCustomError(poolContract, 'WOMBAT_ASSET_ALREADY_PAUSED')
      })

      it('reverts if pause asset is invoked by non-owner', async function () {
        await expect(poolContract.connect(user1).pauseAsset(token0.address)).to.be.revertedWithCustomError(
          poolContract,
          'WOMBAT_FORBIDDEN'
        )
      })

      it('allows deposit if asset paused and unpaused after', async function () {
        await poolContract.connect(owner).pauseAsset(token0.address)
        await expect(
          poolContract
            .connect(user1)
            .deposit(token0.address, parseEther('100'), 0, user1.address, fiveSecondsSince, false)
        ).to.be.revertedWithCustomError(poolContract, 'WOMBAT_ASSET_ALREADY_PAUSED')

        await poolContract.connect(owner).unpauseAsset(token0.address)
        const receipt = await poolContract
          .connect(user1)
          .deposit(token0.address, parseEther('100'), 0, user1.address, fiveSecondsSince, false)

        await expect(receipt)
          .to.emit(poolContract, 'Deposit')
          .withArgs(user1.address, token0.address, parseEther('100'), parseEther('100'), user1.address)
      })

      it('reverts if zero address provided', async function () {
        await expect(
          poolContract
            .connect(user1)
            .deposit(ethers.constants.AddressZero, parseEther('100'), 0, user1.address, fiveSecondsSince, false)
        ).to.be.revertedWithCustomError(poolContract, 'WOMBAT_ASSET_NOT_EXISTS')
      })

      it('reverts if asset not exist', async function () {
        // Create a new ERC20 stablecoin
        const mockToken = await TestERC20Factory.deploy('Tether', 'USDT', 18, parseUnits('1000000', 18)) // 1 mil USDT

        await expect(
          poolContract
            .connect(user1)
            .deposit(mockToken.address, parseEther('100'), 0, user1.address, fiveSecondsSince, false)
        ).to.be.revertedWithCustomError(poolContract, 'WOMBAT_ASSET_NOT_EXISTS')
      })
    })
  })

  describe('Asset vUSDC (8 decimals)', function () {
    describe('deposit', function () {
      beforeEach(async function () {
        // Transfer 100k from vUSDC contract to users
        await token1.connect(owner).transfer(user1.address, parseUnits('100000', 8)) // 100 k
        await token1.connect(owner).transfer(user2.address, parseUnits('600.123', 8))
        // Approve max allowance from users to pool
        await token1.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
        await token1.connect(user2).approve(poolContract.address, ethers.constants.MaxUint256)
      })

      it('works (first LP)', async function () {
        const beforeBalance = await token1.balanceOf(user1.address)
        await poolContract
          .connect(user1)
          .deposit(token1.address, parseUnits('100', 8), 0, user1.address, fiveSecondsSince, false)
        const afterBalance = await token1.balanceOf(user1.address)

        expect(await asset1.cash()).to.be.equal(parseEther('100'))
        expect(await asset1.liability()).to.be.equal(parseEther('100'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('100', 8))
        expect(await asset1.balanceOf(user1.address)).to.be.equal(parseEther('100'))
        expect(await asset1.totalSupply()).to.be.equal(parseEther('100'))
        expect(afterBalance.sub(beforeBalance)).to.be.equal(parseUnits('-100', 8))
      })

      it('works (second LP)', async function () {
        const beforeBalance1 = await token1.balanceOf(user1.address)
        const beforeBalance2 = await token1.balanceOf(user2.address)
        await poolContract
          .connect(user1)
          .deposit(token1.address, parseUnits('100', 8), 0, user1.address, fiveSecondsSince, false)
        await poolContract
          .connect(user2)
          .deposit(token1.address, parseUnits('100.123', 8), 0, user2.address, fiveSecondsSince, false)
        const afterBalance1 = await token1.balanceOf(user1.address)
        const afterBalance2 = await token1.balanceOf(user2.address)

        expect(await asset1.cash()).to.be.equal(parseEther('200.123'))
        expect(await asset1.liability()).to.be.equal(parseEther('200.123'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('200.123', 8))
        expect(await asset1.balanceOf(user1.address)).to.be.equal(parseEther('100'))
        expect(await asset1.balanceOf(user2.address)).to.be.equal(parseEther('100.123'))
        expect(await asset1.totalSupply()).to.be.equal(parseEther('200.123'))

        expect(afterBalance1).to.be.equal(parseUnits('99900', 8)) // 100k - 100
        expect(afterBalance1.sub(beforeBalance1)).to.be.equal(parseUnits('-100', 8)) // 99.9 - 100k
        expect(afterBalance2).to.be.equal(parseUnits('500', 8)) // 600.123 - 100.123
        expect(afterBalance2.sub(beforeBalance2)).to.be.equal(parseUnits('-100.123', 8)) // 500 - 600.123
      })

      it('maintains the LP token supply and liability ratio', async function () {
        await poolContract
          .connect(user1)
          .deposit(token1.address, parseUnits('100', 8), 0, user1.address, fiveSecondsSince, false)
        // Add dividend
        await asset1.connect(owner).setPool(owner.address)
        await asset1.connect(owner).addLiability(parseEther('1.768743'))
        await asset1.connect(owner).setPool(poolContract.address)

        const receipt = await poolContract
          .connect(user2)
          .deposit(token1.address, parseUnits('100', 8), 0, user2.address, fiveSecondsSince, false)
        expect(await asset1.liability()).to.be.equal(parseEther('201.769487242499697330'))
        expect(await asset1.balanceOf(user2.address)).to.be.equal(parseEther('98.262729099935622993'))
        expect(await asset1.totalSupply()).to.be.equal(parseEther('198.262729099935622993'))

        await expect(receipt)
          .to.emit(poolContract, 'Deposit')
          .withArgs(
            user2.address,
            token1.address,
            parseUnits('100', 8),
            parseEther('98.262729099935622993'),
            user2.address
          )
      })
    })
  })

  describe('3 assets, r* = 1, A = 0.001', function () {
    beforeEach(async function () {
      await poolContract.connect(owner).setAmpFactor(parseEther('0.001'))

      // Transfer 100k from BUSD contract to users
      await token0.connect(owner).transfer(user1.address, parseEther('100000')) // 100 k
      await token0.connect(owner).transfer(user2.address, parseEther('600.123'))
      // Approve max allowance from users to pool
      await token0.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await token0.connect(user2).approve(poolContract.address, ethers.constants.MaxUint256)

      // Transfer 100k from vUSDC contract to users
      await token1.connect(owner).transfer(user1.address, parseUnits('100000', 8)) // 100 k
      await token1.connect(owner).transfer(user2.address, parseUnits('600.123', 8))
      // Approve max allowance from users to pool
      await token1.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await token1.connect(user2).approve(poolContract.address, ethers.constants.MaxUint256)

      // Transfer 100k from vUSDC contract to users
      await token2.connect(owner).transfer(user1.address, parseEther('100000')) // 100 k
      await token2.connect(owner).transfer(user2.address, parseEther('600.123'))
      // Approve max allowance from users to pool
      await token2.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await token2.connect(user2).approve(poolContract.address, ethers.constants.MaxUint256)
    })

    it('rx = 0.80', async function () {
      // Faucet
      await asset0.connect(owner).setPool(owner.address)
      await asset0.connect(owner).addCash(parseEther('12000'))
      await asset0.connect(owner).addLiability(parseEther('10000'))
      await asset0.connect(owner).setPool(poolContract.address)

      await asset1.connect(owner).setPool(owner.address)
      await asset1.connect(owner).addCash(parseEther('8000.83203342'))
      await asset1.connect(owner).addLiability(parseEther('10000'))
      await asset1.connect(owner).mint(user1.address, parseEther('5000'))
      await asset1.connect(owner).setPool(poolContract.address)

      await asset2.connect(owner).setPool(owner.address)
      await asset2.connect(owner).addCash(parseEther('1000'))
      await asset2.connect(owner).addLiability(parseEther('1000'))
      await asset2.connect(owner).setPool(poolContract.address)

      const receipt = await poolContract
        .connect(user1)
        .deposit(token1.address, parseUnits('4999.80813996', 8), 0, user1.address, fiveSecondsSince, false)

      await expect(receipt)
        .to.emit(poolContract, 'Deposit')
        .withArgs(
          user1.address,
          token1.address,
          parseUnits('4999.80813996', 8),
          parseEther('2499.99999999758028675'),
          user1.address
        )

      expect(await poolContract.connect(owner).globalEquilCovRatio()).to.deep.equal([
        parseEther('1.000000000000141728'),
        parseEther('25973.999999998854027507'),
      ])
    })

    it('rx = 1.53', async function () {
      // Faucet
      await asset0.connect(owner).setPool(owner.address)
      await asset0.connect(owner).addCash(parseEther('5000'))
      await asset0.connect(owner).addLiability(parseEther('10000'))
      await asset0.connect(owner).setPool(poolContract.address)

      await asset1.connect(owner).setPool(owner.address)
      await asset1.connect(owner).addCash(parseEther('15006.66370633'))
      await asset1.connect(owner).addLiability(parseEther('10000'))
      await asset1.connect(owner).mint(user1.address, parseEther('10000'))
      await asset1.connect(owner).setPool(poolContract.address)

      await asset2.connect(owner).setPool(owner.address)
      await asset2.connect(owner).addCash(parseEther('1000'))
      await asset2.connect(owner).addLiability(parseEther('1000'))
      await asset2.connect(owner).setPool(poolContract.address)

      const receipt = await poolContract
        .connect(user1)
        .deposit(token1.address, parseUnits('4999.58278111', 8), 0, user1.address, fiveSecondsSince, false)

      await expect(receipt)
        .to.emit(poolContract, 'Deposit')
        .withArgs(
          user1.address,
          token1.address,
          parseUnits('4999.58278111', 8),
          parseEther('4999.999999996658854000'),
          user1.address
        )

      expect(await poolContract.connect(owner).globalEquilCovRatio()).to.deep.equal([
        parseEther('0.999999999999826026'),
        parseEther('25973.999999992134367382'),
      ])
    })

    it('A = 0.002, should handle rounding error', async function () {
      await poolContract.connect(owner).setAmpFactor(parseEther('0.002'))
      await asset1.connect(owner).setPool(owner.address)
      await asset1.connect(owner).addCash(parseEther('20011837.600651'))
      await asset1.connect(owner).addLiability(parseEther('20011812.10065'))
      await asset1.connect(owner).mint(user1.address, parseEther('20011812.10065'))
      await asset1.connect(owner).setPool(poolContract.address)

      const receipt = await poolContract
        .connect(user1)
        .deposit(token1.address, parseUnits('0.01', 8), 0, user1.address, fiveSecondsSince, false)

      await expect(receipt)
        .to.emit(poolContract, 'Deposit')
        .withArgs(user1.address, token1.address, parseUnits('0.01', 8), parseEther('0.01'), user1.address)

      expect(await poolContract.connect(owner).globalEquilCovRatio()).to.deep.equal([
        parseEther('1.000001274247472392'),
        parseEther('19971814.037429637005304507'),
      ])
    })
  })

  describe('deposit and stake', function () {
    beforeEach(async function () {
      const startTime = (await latest()).add(60)
      wom = await TestERC20Factory.deploy('mock', 'MOCK', 18, parseEther('100'))
      veWom = await TestERC20Factory.deploy('mock', 'MOCK', 18, parseEther('100'))
      masterWombat = await MasterWombatFactory.deploy()

      await masterWombat.connect(owner).initialize(wom.address, veWom.address, 1e8, 1000, startTime)

      await masterWombat
        .connect(owner)
        .add(parseEther('10'), asset0.address, '0x0000000000000000000000000000000000000000')
      await masterWombat
        .connect(owner)
        .add(parseEther('10'), asset1.address, '0x0000000000000000000000000000000000000000')

      await poolContract.connect(owner).setMasterWombat(masterWombat.address)

      // Transfer 100k from vUSDC contract to users
      await token1.connect(owner).transfer(user1.address, parseUnits('100000', 8)) // 100 k
      // Approve max allowance from users to pool
      await token1.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
    })

    it('should work', async function () {
      expect(await masterWombat.getAssetPid(asset0.address)).to.equal(0)
      expect(await masterWombat.getAssetPid(asset1.address)).to.equal(1)
      // skip this line as chai is unable to get the revert reason
      // Solution : https://github.com/NomicFoundation/hardhat/issues/3365
      // TODO: To be solved after hardhat@ir is integrated to the normal version
      // await expect(masterWombat.getAssetPid(asset2.address)).to.be.reverted

      // deposit and stake
      await poolContract
        .connect(user1)
        .deposit(token1.address, parseUnits('100', 8), 0, user1.address, fiveSecondsSince, true)

      expect((await masterWombat.userInfo(1, user1.address)).amount).to.equal(parseEther('100'))
    })
  })
})
