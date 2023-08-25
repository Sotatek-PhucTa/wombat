import { AddressZero } from '@ethersproject/constants'
import { parseEther, parseUnits } from '@ethersproject/units'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'

import { BigNumber, Contract } from 'ethers'
import { ethers } from 'hardhat'
import {
  Asset,
  Asset__factory,
  ERC20,
  CrossChainPool,
  CrossChainPool__factory,
  MockAdaptor,
  MockAdaptor__factory,
  TestERC20__factory,
} from '../../build/typechain'

describe('CrossChainPool', function () {
  let owner: SignerWithAddress
  let user1: SignerWithAddress
  let AssetFactory: Asset__factory
  let TestERC20Factory: TestERC20__factory
  let PoolFactory: CrossChainPool__factory
  let MockAdaptorFactory: MockAdaptor__factory
  let pool: CrossChainPool
  let mockAdaptor: MockAdaptor
  let token0: ERC20 // BUSD
  let token1: ERC20 // USDC
  let token2: ERC20 // CAKE
  let token3: ERC20 // USDT
  let asset0: Asset // BUSD LP
  let asset1: Asset // USDC LP
  let asset2: Asset // CAKE LP
  let asset3: Asset // USDT LP
  let coreV3: Contract
  let lastBlockTime: number
  let fiveSecondsSince: number

  before(async function () {
    const [first, ...rest] = await ethers.getSigners()
    owner = first
    user1 = rest[0]

    // get last block time
    const lastBlock = await ethers.provider.getBlock('latest')
    lastBlockTime = lastBlock.timestamp
    fiveSecondsSince = lastBlockTime + 5 * 1000

    // Get Factories
    AssetFactory = (await ethers.getContractFactory('Asset')) as Asset__factory
    TestERC20Factory = (await ethers.getContractFactory('TestERC20')) as TestERC20__factory
    MockAdaptorFactory = (await ethers.getContractFactory('MockAdaptor')) as MockAdaptor__factory
    const CoreV3Factory = await ethers.getContractFactory('CoreV3')
    coreV3 = await CoreV3Factory.deploy()
    PoolFactory = (await ethers.getContractFactory('CrossChainPool', {
      libraries: { CoreV3: coreV3.address },
    })) as CrossChainPool__factory
  })

  beforeEach(async function () {
    // Deploy with factories
    token0 = await TestERC20Factory.deploy('Binance USD', 'BUSD', 18, parseUnits('1000000', 18)) // 1 mil BUSD
    token1 = await TestERC20Factory.deploy('Venus USDC', 'vUSDC', 6, parseUnits('10000000', 6)) // 10 mil vUSDC
    token2 = await TestERC20Factory.deploy('PancakeSwap Token', 'CAKE', 18, parseUnits('1000000', 18)) // 1 mil CAKE
    token3 = await TestERC20Factory.deploy('USD Tether', 'USDT', 8, parseUnits('1000000', 8)) // 1 mil USDT
    asset0 = await AssetFactory.deploy(token0.address, 'Binance USD LP', 'BUSD-LP')
    asset1 = await AssetFactory.deploy(token1.address, 'Venus USDC LP', 'vUSDC-LP')
    asset2 = await AssetFactory.deploy(token2.address, 'PancakeSwap Token LP', 'CAKE-LP')
    asset3 = await AssetFactory.deploy(token3.address, 'USD Tether Token LP', 'USDT-LP')
    pool = await PoolFactory.connect(owner).deploy()
    mockAdaptor = await MockAdaptorFactory.deploy()

    // set pool address
    await Promise.all([
      asset0.setPool(pool.address),
      asset1.setPool(pool.address),
      asset2.setPool(pool.address),
      asset3.setPool(pool.address),
    ])

    // initialize pool contract
    await pool.initialize(parseEther('0.002'), parseEther('0.0004'))
    await pool.setAdaptorAddr(mockAdaptor.address)

    await mockAdaptor.initialize(0, pool.address)

    // Add BUSD & USDC & USDT assets to pool
    await pool.connect(owner).addAsset(token0.address, asset0.address)
    await pool.connect(owner).addAsset(token1.address, asset1.address)
    await pool.connect(owner).addAsset(token2.address, asset2.address)
    await pool.connect(owner).addAsset(token3.address, asset3.address)

    await pool.connect(owner).setCrossChainHaircut(0, parseEther('0.004'))
    await pool.setMaximumOutboundCredit(parseEther('100000'))
    await pool.setSwapTokensForCreditEnabled(true)
    await pool.setSwapCreditForTokensEnabled(true)
    await mockAdaptor.approveToken(0, AddressZero)
  })

  describe('Utils', async function () {
    beforeEach(async function () {
      // Transfer 100k of stables to user1
      await token1.connect(owner).transfer(user1.address, parseUnits('100000', 6))
      // Approve max allowance of tokens from users to pool
      await token1.connect(user1).approve(pool.address, ethers.constants.MaxUint256)

      await pool
        .connect(user1)
        .deposit(token1.address, parseUnits('10000', 6), 0, user1.address, fiveSecondsSince, false)
    })

    it('completeSwapCreditForTokens - only adaptor', async function () {
      await expect(
        pool.completeSwapCreditForTokens(
          token0.address,
          parseEther('100.998023754471257486'),
          parseEther('99'),
          user1.address
        )
      ).to.be.reverted
    })

    it('swapTokensForTokensCrossChain - WOMBAT_ZERO_AMOUNT', async function () {
      await expect(
        pool
          .connect(user1)
          .swapTokensForTokensCrossChain(
            token1.address,
            AddressZero,
            0,
            0,
            parseEther('99'),
            parseEther('99'),
            user1.address,
            0,
            0
          )
      ).to.revertedWithCustomError(pool, 'WOMBAT_ZERO_AMOUNT')
    })

    it('swapTokensForTokensCrossChain - WOMBAT_ZERO_CREDIT_AMOUNT', async function () {
      // Transfer 100k of stables to user1
      await token0.connect(owner).transfer(user1.address, parseEther('100000'))
      // Approve max allowance of tokens from users to pool
      await token0.connect(user1).approve(pool.address, ethers.constants.MaxUint256)
      await pool.connect(user1).deposit(token0.address, parseEther('1000'), 0, user1.address, fiveSecondsSince, false)

      await pool.setCrossChainHaircut(parseEther('0.1'), parseEther('0.1'))
      await pool.setCovRatioFeeParam(parseEther('100'), parseEther('120'))

      await pool
        .connect(user1)
        .swapTokensForTokensCrossChain(token0.address, AddressZero, 0, parseEther('10000'), 0, 0, user1.address, 0, 0)

      await expect(
        pool.connect(user1).swapTokensForTokensCrossChain(token0.address, AddressZero, 0, 1, 0, 0, user1.address, 0, 0)
      ).to.revertedWithCustomError(pool, 'WOMBAT_ZERO_CREDIT_AMOUNT')
    })

    it('swapTokensForTokensCrossChain - WOMBAT_ZERO_CREDIT_AMOUNT', async function () {
      // Transfer 100k of stables to user1
      await token0.connect(owner).transfer(user1.address, parseEther('100000'))
      // Approve max allowance of tokens from users to pool
      await token0.connect(user1).approve(pool.address, ethers.constants.MaxUint256)
      await pool.connect(user1).deposit(token0.address, parseEther('1000'), 0, user1.address, fiveSecondsSince, false)

      await pool.setCrossChainHaircut(parseEther('0.1'), parseEther('0.1'))
      await pool.setCovRatioFeeParam(parseEther('100'), parseEther('120'))

      await pool
        .connect(user1)
        .swapTokensForTokensCrossChain(token0.address, AddressZero, 0, parseEther('10000'), 0, 0, user1.address, 0, 0)

      await expect(
        pool.connect(user1).swapTokensForTokensCrossChain(token0.address, AddressZero, 0, 1, 0, 0, user1.address, 0, 0)
      ).to.revertedWithCustomError(pool, 'WOMBAT_ZERO_CREDIT_AMOUNT')
    })

    it('swapCreditForTokens - WOMBAT_ZERO_AMOUNT', async function () {
      await expect(
        pool.connect(user1).swapCreditForTokens(token1.address, 0, parseUnits('99', 6), user1.address)
      ).to.be.revertedWithCustomError(pool, 'WOMBAT_ZERO_AMOUNT')
    })

    it('swapCreditForTokensCrossChain - WOMBAT_ZERO_AMOUNT', async function () {
      await expect(
        pool.connect(user1).swapCreditForTokensCrossChain(token2.address, 1, 0, parseEther('99'), user1.address, 0, 0)
      ).to.be.revertedWithCustomError(pool, 'WOMBAT_ZERO_AMOUNT')
    })

    it('swapCreditForTokens - POOL__CREDIT_NOT_ENOUGH', async function () {
      await mockAdaptor.connect(user1).faucetCredit(parseEther('99.998023754471257485'))
      await pool.setMaximumInboundCredit(parseEther('200'))

      // verify the return value
      await expect(
        pool
          .connect(user1)
          .swapCreditForTokens(token1.address, parseEther('100.198019801980200001'), parseUnits('99', 6), user1.address)
      ).to.be.revertedWithCustomError(pool, 'POOL__CREDIT_NOT_ENOUGH')

      // verify the return value
      expect(
        await pool
          .connect(user1)
          .swapCreditForTokens(token1.address, parseEther('99.998023754471257485'), parseUnits('99', 6), user1.address)
      ).to.be.ok
    })

    it('swapCreditForTokensCrossChain - POOL__CREDIT_NOT_ENOUGH', async function () {
      await mockAdaptor.connect(user1).faucetCredit(parseEther('99.998023754471257485'))
      await mockAdaptor.approveToken(1, token2.address)

      // verify the return value
      await expect(
        pool
          .connect(user1)
          .swapCreditForTokensCrossChain(
            token2.address,
            1,
            parseEther('100.198019801980200001'),
            parseEther('99'),
            user1.address,
            0,
            0
          )
      ).to.be.revertedWithCustomError(pool, 'POOL__CREDIT_NOT_ENOUGH')

      // verify the return value
      expect(
        await pool
          .connect(user1)
          .swapCreditForTokensCrossChain(
            token2.address,
            1,
            parseEther('99.998023754471257485'),
            parseEther('99'),
            user1.address,
            0,
            0
          )
      ).to.be.ok
    })

    it('swapTokensForTokensCrossChain - tokensForCreditHaircut', async function () {
      // Transfer 100k of stables to user1
      await token0.connect(owner).transfer(user1.address, parseEther('100000'))
      // Approve max allowance of tokens from users to pool
      await token0.connect(user1).approve(pool.address, ethers.constants.MaxUint256)
      await pool.connect(user1).deposit(token0.address, parseEther('10000'), 0, user1.address, fiveSecondsSince, false)

      await pool.setCrossChainHaircut(parseEther('0.004'), parseEther('0.004'))
      await pool.setFeeTo(owner.address)
      await pool.setFee(0, 0)

      // verify the return value
      const result = await pool
        .connect(user1)
        .callStatic.swapTokensForTokensCrossChain(
          token0.address,
          AddressZero,
          0,
          parseEther('100'),
          parseEther('99'),
          parseEther('99'),
          user1.address,
          0,
          0
        )
      expect(result.creditAmount).to.eq(parseEther('99.598039455170219560'))
      expect(result.fromTokenHaircut).to.eq(parseEther('0.4'))

      // verify quote function
      const quoteResult = await pool.quoteSwapTokensForCredit(token0.address, parseEther('100'))
      expect(quoteResult.creditAmount).to.be.equal(result.creditAmount)
      expect(quoteResult.feeInFromToken).to.be.equal(result.fromTokenHaircut)

      const balanceBefore = (await token0.balanceOf(user1.address)) as BigNumber
      const receipt = await pool
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token0.address,
          AddressZero,
          0,
          parseEther('100'),
          parseEther('99'),
          parseEther('99'),
          user1.address,
          0,
          0
        )

      await expect(receipt)
        .to.emit(pool, 'SwapTokensForCredit')
        .withArgs(user1.address, token0.address, parseEther('100'), result.fromTokenHaircut, result.creditAmount)
      expect(await pool.totalCreditMinted()).to.eq(result.creditAmount)

      expect(await pool.mintFee(token0.address)).to.changeTokenBalance(token0, owner.address, parseEther('0.4'))

      const balanceAfter = (await token0.balanceOf(user1.address)) as BigNumber
      expect(balanceBefore.sub(balanceAfter)).eq(parseEther('100'))

      expect((await pool.globalEquilCovRatioWithCredit()).equilCovRatio).to.eq(parseEther('1'))
    })

    it('swapTokensForTokensCrossChain - tokensForCreditHaircut w/ high cov ratio fee', async function () {
      // Transfer 100k of stables to user1
      await token0.connect(owner).transfer(user1.address, parseEther('100000'))
      // Approve max allowance of tokens from users to pool
      await token0.connect(user1).approve(pool.address, ethers.constants.MaxUint256)
      await pool.connect(user1).deposit(token0.address, parseEther('10000'), 0, user1.address, fiveSecondsSince, false)

      await pool.setCrossChainHaircut(parseEther('0.004'), parseEther('0.004'))
      await pool.setFeeTo(owner.address)
      await pool.setFee(0, 0)
      await pool.setCovRatioFeeParam(parseEther('1'), parseEther('1.5'))
      // verify the return value
      const result = await pool
        .connect(user1)
        .callStatic.swapTokensForTokensCrossChain(
          token0.address,
          AddressZero,
          0,
          parseEther('5000'),
          0,
          0,
          user1.address,
          0,
          0
        )
      expect(result.creditAmount).to.eq(parseEther('2489.009171408983473053'))
      expect(result.fromTokenHaircut).to.eq(parseEther('2510.000000000000000000')) // about 50.2% fee

      // verify quote function
      const quoteResult = await pool.quoteSwapTokensForCredit(token0.address, parseEther('5000'))
      expect(quoteResult.creditAmount).to.be.equal(result.creditAmount)
      expect(quoteResult.feeInFromToken).to.be.equal(result.fromTokenHaircut)

      const balanceBefore = (await token0.balanceOf(user1.address)) as BigNumber
      const receipt = await pool
        .connect(user1)
        .swapTokensForTokensCrossChain(token0.address, AddressZero, 0, parseEther('5000'), 0, 0, user1.address, 0, 0)

      await expect(receipt)
        .to.emit(pool, 'SwapTokensForCredit')
        .withArgs(user1.address, token0.address, parseEther('5000'), result.fromTokenHaircut, result.creditAmount)
      expect(await pool.totalCreditMinted()).to.eq(result.creditAmount)

      const feeTokenBefore = await token0.balanceOf(owner.address)
      await pool.mintFee(token0.address)
      const feeTokenAfter = await token0.balanceOf(owner.address)
      expect(feeTokenAfter.sub(feeTokenBefore)).to.be.equal(parseEther('2510'))

      const balanceAfter = (await token0.balanceOf(user1.address)) as BigNumber
      expect(balanceBefore.sub(balanceAfter)).eq(parseEther('5000'))

      expect((await pool.globalEquilCovRatioWithCredit()).equilCovRatio).to.eq(parseEther('1'))
    })

    it('swapTokensForTokensCrossChain - respect minimumCreditAmount', async function () {
      // Transfer 100k of stables to user1
      await token0.connect(owner).transfer(user1.address, parseEther('100000'))
      // Approve max allowance of tokens from users to pool
      await token0.connect(user1).approve(pool.address, ethers.constants.MaxUint256)
      await pool.connect(user1).deposit(token0.address, parseEther('10000'), 0, user1.address, fiveSecondsSince, false)

      await expect(
        pool
          .connect(user1)
          .swapTokensForTokensCrossChain(
            token0.address,
            AddressZero,
            0,
            parseEther('100'),
            parseEther('101'),
            parseEther('99'),
            user1.address,
            0,
            0
          )
      ).to.revertedWithCustomError(pool, 'WOMBAT_AMOUNT_TOO_LOW')
    })

    it('swapTokensForTokensCrossChain - POOL__REACH_MAXIMUM_MINTED_CREDIT', async function () {
      await pool.setMaximumOutboundCredit(0)
      // Transfer 100k of stables to user1
      await token0.connect(owner).transfer(user1.address, parseEther('100000'))
      // Approve max allowance of tokens from users to pool
      await token0.connect(user1).approve(pool.address, ethers.constants.MaxUint256)
      await pool.connect(user1).deposit(token0.address, parseEther('10000'), 0, user1.address, fiveSecondsSince, false)

      await expect(
        pool
          .connect(user1)
          .swapTokensForTokensCrossChain(token0.address, AddressZero, 0, 100000, 0, 0, user1.address, 0, 0)
      ).to.be.revertedWithCustomError(pool, 'POOL__REACH_MAXIMUM_MINTED_CREDIT')

      await expect(pool.quoteSwapTokensForCredit(token0.address, 100000)).to.be.revertedWithCustomError(
        pool,
        'POOL__REACH_MAXIMUM_MINTED_CREDIT'
      )
    })

    it('swapCreditForTokens - respect minimumToAmount', async function () {
      await mockAdaptor.connect(user1).faucetCredit(parseEther('99.998023754471257485'))

      // verify the return value
      await expect(
        pool
          .connect(user1)
          .swapCreditForTokens(
            token1.address,
            parseEther('99.998023754471257485'),
            parseUnits('99.7', 6),
            user1.address
          )
      ).to.be.revertedWithCustomError(pool, 'WOMBAT_AMOUNT_TOO_LOW')
    })

    it('swapCreditForTokens - POOL__REACH_MAXIMUM_BURNED_CREDIT', async function () {
      // Transfer 100k of stables to user1
      await token0.connect(owner).transfer(user1.address, parseEther('100000'))
      // Approve max allowance of tokens from users to pool
      await token0.connect(user1).approve(pool.address, ethers.constants.MaxUint256)
      await pool.connect(user1).deposit(token0.address, parseEther('10000'), 0, user1.address, fiveSecondsSince, false)

      // put more cash to prepare the pool state
      await pool
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token0.address,
          AddressZero,
          0,
          parseEther('100'),
          parseEther('99'),
          parseEther('99'),
          user1.address,
          0,
          0
        )
      await pool.setMaximumInboundCredit(parseEther('1'))
      await mockAdaptor.connect(user1).faucetCredit(parseEther('200'))

      // verify the return value
      await expect(
        pool
          .connect(user1)
          .callStatic.swapCreditForTokens(
            token0.address,
            parseEther('101.198019801980200001'),
            parseEther('99'),
            user1.address
          )
      ).to.be.revertedWithCustomError(pool, 'POOL__REACH_MAXIMUM_BURNED_CREDIT')

      await expect(
        pool.quoteSwapCreditForTokens(token0.address, parseEther('101.198019801980200001'))
      ).to.be.revertedWithCustomError(pool, 'POOL__REACH_MAXIMUM_BURNED_CREDIT')

      expect(
        await pool
          .connect(user1)
          .callStatic.swapCreditForTokens(
            token0.address,
            parseEther('100.998023754471257485'),
            parseEther('99'),
            user1.address
          )
      ).to.be.ok

      expect(await pool.quoteSwapCreditForTokens(token0.address, parseEther('100.998023754471257485'))).to.be.ok
    })

    it('completeSwapCreditForTokens - POOL__REACH_MAXIMUM_BURNED_CREDIT', async function () {
      // Transfer 100k of stables to user1
      await token0.connect(owner).transfer(user1.address, parseEther('100000'))
      // Approve max allowance of tokens from users to pool
      await token0.connect(user1).approve(pool.address, ethers.constants.MaxUint256)
      await pool.connect(user1).deposit(token0.address, parseEther('10000'), 0, user1.address, fiveSecondsSince, false)

      // put more cash to prepare the pool state
      await pool
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token0.address,
          AddressZero,
          0,
          parseEther('100'),
          parseEther('99'),
          parseEther('99'),
          user1.address,
          0,
          0
        )
      await pool.setMaximumInboundCredit(parseEther('1'))
      await mockAdaptor.connect(user1).faucetCredit(parseEther('200'))
      await pool.setAdaptorAddr(user1.address)

      // verify the return value
      await expect(
        pool
          .connect(user1)
          .callStatic.completeSwapCreditForTokens(
            token0.address,
            parseEther('100.998023754471257486'),
            parseEther('99'),
            user1.address
          )
      ).to.be.revertedWithCustomError(pool, 'POOL__REACH_MAXIMUM_BURNED_CREDIT')

      await expect(
        pool.quoteSwapCreditForTokens(token0.address, parseEther('100.998023754471257486'))
      ).to.be.revertedWithCustomError(pool, 'POOL__REACH_MAXIMUM_BURNED_CREDIT')

      expect(
        await pool
          .connect(user1)
          .callStatic.completeSwapCreditForTokens(
            token0.address,
            parseEther('100.998023754471257485'),
            parseEther('99'),
            user1.address
          )
      ).to.be.ok

      expect(await pool.quoteSwapCreditForTokens(token0.address, parseEther('100.998023754471257485'))).to.be.ok
    })

    it('completeSwapCreditForTokens - msg.sender', async function () {
      // only relayer can call `completeSwapCreditForTokens`
      await expect(pool.completeSwapCreditForTokens(token2.address, parseEther('100'), parseEther('99'), user1.address))
        .to.be.reverted
    })

    it('mintCredit - msg.sender', async function () {
      // only relayer can call `mintCredit`
      await expect(pool.mintCredit(parseEther('100'), user1.address)).to.be.reverted
    })

    it('Adaptor - _isTokenValid', async function () {
      // Transfer 100k of stables to user1
      await token0.connect(owner).transfer(user1.address, parseEther('100000'))
      // Approve max allowance of tokens from users to pool
      await token0.connect(user1).approve(pool.address, ethers.constants.MaxUint256)

      await pool.connect(user1).deposit(token0.address, parseEther('10000'), 0, user1.address, fiveSecondsSince, false)

      await expect(
        pool
          .connect(user1)
          .swapTokensForTokensCrossChain(
            token0.address,
            token1.address,
            0,
            parseEther('100'),
            parseEther('99'),
            parseEther('99'),
            user1.address,
            0,
            0
          )
      ).to.be.revertedWithCustomError(mockAdaptor, 'ADAPTOR__INVALID_TOKEN')
    })
  })

  describe('Asset BUSD (18 decimals)', async function () {
    beforeEach(async function () {
      // Transfer 100k of stables to user1
      await token0.connect(owner).transfer(user1.address, parseEther('100000'))
      // Approve max allowance of tokens from users to pool
      await token0.connect(user1).approve(pool.address, ethers.constants.MaxUint256)

      await pool.connect(user1).deposit(token0.address, parseEther('10000'), 0, user1.address, fiveSecondsSince, false)
    })

    it('swapTokensForTokensCrossChain', async function () {
      // verify the return value
      const result = await pool
        .connect(user1)
        .callStatic.swapTokensForTokensCrossChain(
          token0.address,
          AddressZero,
          0,
          parseEther('100'),
          parseEther('99'),
          parseEther('99'),
          user1.address,
          0,
          0
        )
      expect(result.creditAmount).to.eq(parseEther('99.998023754471257485'))
      expect(result.fromTokenHaircut).to.eq(parseEther('0'))

      // verify quote function
      const { creditAmount, feeInFromToken } = await pool.quoteSwapTokensForCredit(token0.address, parseEther('100'))
      expect(creditAmount).to.be.equal(result.creditAmount)
      expect(feeInFromToken).to.equal(result.fromTokenHaircut)

      const balanceBefore = (await token0.balanceOf(user1.address)) as BigNumber
      const receipt = await pool
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token0.address,
          AddressZero,
          0,
          parseEther('100'),
          parseEther('99'),
          parseEther('99'),
          user1.address,
          0,
          0
        )

      await expect(receipt)
        .to.emit(pool, 'SwapTokensForCredit')
        .withArgs(user1.address, token0.address, parseEther('100'), result.fromTokenHaircut, result.creditAmount)
      expect(await pool.totalCreditMinted()).to.eq(parseEther('99.998023754471257485'))

      const balanceAfter = (await token0.balanceOf(user1.address)) as BigNumber
      expect(balanceBefore.sub(balanceAfter)).eq(parseEther('100'))

      expect((await pool.globalEquilCovRatioWithCredit()).equilCovRatio).to.eq(parseEther('1'))
    })

    it('swapCreditForTokens', async function () {
      // put more cash to prepare the pool state
      await pool
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token0.address,
          AddressZero,
          0,
          parseEther('100'),
          parseEther('99'),
          parseEther('99'),
          user1.address,
          0,
          0
        )
      await mockAdaptor.connect(user1).faucetCredit(parseEther('99.998023754471257485'))

      // verify the return value
      const result = await pool
        .connect(user1)
        .callStatic.swapCreditForTokens(
          token0.address,
          parseEther('99.998023754471257485'),
          parseEther('99'),
          user1.address
        )
      expect(result.actualToAmount).to.eq(parseEther('99.6'))
      expect(result.haircut).to.eq(parseEther('0.4'))

      // verify quote function
      expect(await pool.quoteSwapCreditForTokens(token0.address, parseEther('99.998023754471257485'))).to.be.equal(
        result.actualToAmount
      )

      const balanceBefore = (await token0.balanceOf(user1.address)) as BigNumber
      const receipt = await pool
        .connect(user1)
        .swapCreditForTokens(token0.address, parseEther('99.998023754471257485'), parseEther('99'), user1.address)
      expect(receipt)
        .to.emit(pool, 'SwapCreditForTokens')
        .withArgs(
          parseEther('99.998023754471257485'),
          token0.address,
          result.actualToAmount,
          result.haircut,
          user1.address,
          1
        )
      const balanceAfter = (await token0.balanceOf(user1.address)) as BigNumber
      expect(balanceAfter.sub(balanceBefore)).eq(parseEther('99.6'))

      expect(await asset0.cash()).to.equal(parseEther('10000'))
      expect(await pool.totalCreditBurned()).to.equal(parseEther('99.998023754471257485'))

      expect((await pool.globalEquilCovRatioWithCredit()).equilCovRatio).to.eq(parseEther('1'))
    })

    it('high cov ratio fee', async function () {
      // put more cash to prepare the pool state
      await pool
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token0.address,
          AddressZero,
          0,
          parseEther('5000'),
          parseEther('4900'),
          parseEther('4900'),
          user1.address,
          0,
          0
        )
      // now the cov ratio is 1.5

      // cov ratio cannot be higher than 1.8
      await expect(
        pool
          .connect(user1)
          .callStatic.swapTokensForTokensCrossChain(
            token0.address,
            AddressZero,
            0,
            parseEther('3001'),
            parseEther('5000'),
            parseEther('5000'),
            user1.address,
            0,
            0
          )
      ).to.be.revertedWithCustomError(coreV3, 'CORE_COV_RATIO_LIMIT_EXCEEDED')

      // verify the return value
      const result = await pool
        .connect(user1)
        .callStatic.swapTokensForTokensCrossChain(
          token0.address,
          AddressZero,
          0,
          parseEther('2900'),
          parseEther('1400'),
          parseEther('1400'),
          user1.address,
          0,
          0
        )
      expect(result.creditAmount).to.eq(parseEther('1496.551127801305489021'))
      expect(result.fromTokenHaircut).to.eq(parseEther('1401.666666666666665700'))

      // verify quote function
      const { creditAmount, feeInFromToken } = await pool.quoteSwapTokensForCredit(token0.address, parseEther('2900'))
      expect(creditAmount).to.be.equal(result.creditAmount)
      expect(feeInFromToken).to.equal(result.fromTokenHaircut)

      const balanceBefore = (await token0.balanceOf(user1.address)) as BigNumber
      const creditBefore = (await pool.totalCreditMinted()) as BigNumber
      await pool.setFeeTo(owner.address)
      const receipt = await pool
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token0.address,
          AddressZero,
          0,
          parseEther('2900'),
          parseEther('1400'),
          parseEther('1400'),
          user1.address,
          0,
          0
        )

      await expect(receipt)
        .to.emit(pool, 'SwapTokensForCredit')
        .withArgs(user1.address, token0.address, parseEther('2900'), result.fromTokenHaircut, result.creditAmount)

      const creditAfter = (await pool.totalCreditMinted()) as BigNumber
      expect(creditAfter.sub(creditBefore)).to.eq(result.creditAmount)

      const balanceAfter = (await token0.balanceOf(user1.address)) as BigNumber
      expect(balanceBefore.sub(balanceAfter)).eq(parseEther('2900'))
    })

    it.skip('swapCreditForTokensCrossChain', async function () {
      // not applicable
    })

    it.skip('completeSwapCreditForTokens', async function () {
      // not applicable
    })
  })

  describe('Asset vUSDC (6 decimals)', async function () {
    beforeEach(async function () {
      // Transfer 100k of stables to user1
      await token1.connect(owner).transfer(user1.address, parseUnits('100000', 6))
      // Approve max allowance of tokens from users to pool
      await token1.connect(user1).approve(pool.address, ethers.constants.MaxUint256)

      await pool
        .connect(user1)
        .deposit(token1.address, parseUnits('10000', 6), 0, user1.address, fiveSecondsSince, false)
    })

    it('swapTokensForTokensCrossChain', async function () {
      // verify the return value
      const result = await pool
        .connect(user1)
        .callStatic.swapTokensForTokensCrossChain(
          token1.address,
          AddressZero,
          0,
          parseUnits('100', 6),
          parseEther('99'),
          parseEther('99'),
          user1.address,
          0,
          0
        )
      expect(result.creditAmount).to.eq(parseEther('99.998023754471257485'))
      expect(result.fromTokenHaircut).to.eq(0)

      // verify quote function
      const { creditAmount, feeInFromToken } = await pool.quoteSwapTokensForCredit(token1.address, parseUnits('100', 6))
      expect(creditAmount).to.be.equal(result.creditAmount)
      expect(feeInFromToken).to.equal(result.fromTokenHaircut)

      const balanceBefore = (await token1.balanceOf(user1.address)) as BigNumber
      const receipt = await pool
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token1.address,
          AddressZero,
          0,
          parseUnits('100', 6),
          parseEther('99'),
          parseEther('99'),
          user1.address,
          0,
          0
        )

      await expect(receipt)
        .to.emit(pool, 'SwapTokensForCredit')
        .withArgs(user1.address, token1.address, parseUnits('100', 6), result.fromTokenHaircut, result.creditAmount)
      expect(await pool.totalCreditMinted()).to.eq(parseEther('99.998023754471257485'))

      const balanceAfter = (await token1.balanceOf(user1.address)) as BigNumber
      expect(balanceBefore.sub(balanceAfter)).eq(parseUnits('100', 6))

      expect((await pool.globalEquilCovRatioWithCredit()).equilCovRatio).to.eq(parseEther('1'))
    })

    it('swapCreditForTokens', async function () {
      // put more cash to prepare the pool state
      await pool
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token1.address,
          AddressZero,
          0,
          parseUnits('100', 6),
          parseEther('99'),
          parseEther('99'),
          user1.address,
          0,
          0
        )
      await mockAdaptor.connect(user1).faucetCredit(parseEther('99.998023754471257485'))

      // verify the return value
      const result = await pool
        .connect(user1)
        .callStatic.swapCreditForTokens(
          token1.address,
          parseEther('99.998023754471257485'),
          parseUnits('99', 6),
          user1.address
        )
      expect(result.actualToAmount).to.eq(parseUnits('99.6', 6))
      expect(result.haircut).to.eq(parseUnits('0.4', 6))

      // verify quote function
      expect(await pool.quoteSwapCreditForTokens(token1.address, parseEther('99.998023754471257485'))).to.be.equal(
        result.actualToAmount
      )

      const balanceBefore = (await token1.balanceOf(user1.address)) as BigNumber
      const receipt = await pool
        .connect(user1)
        .swapCreditForTokens(token1.address, parseEther('99.998023754471257485'), parseUnits('99', 6), user1.address)
      expect(receipt)
        .to.emit(pool, 'SwapCreditForTokens')
        .withArgs(
          parseEther('99.998023754471257485'),
          token1.address,
          result.actualToAmount,
          result.haircut,
          user1.address,
          1
        )
      const balanceAfter = (await token1.balanceOf(user1.address)) as BigNumber
      expect(balanceAfter.sub(balanceBefore)).eq(parseUnits('99.6', 6))

      expect(await asset1.cash()).to.equal(parseEther('10000'))
      expect(await pool.totalCreditBurned()).to.equal(parseEther('99.998023754471257485'))

      expect((await pool.globalEquilCovRatioWithCredit()).equilCovRatio).to.eq(parseEther('1'))
    })

    it('high cov ratio fee', async function () {
      // put more cash to prepare the pool state
      await pool
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token1.address,
          AddressZero,
          0,
          parseUnits('5000', 6),
          parseEther('4900'),
          parseEther('4900'),
          user1.address,
          0,
          0
        )
      // now the cov ratio is 1.5

      // cov ratio cannot be higher than 1.8
      await expect(
        pool
          .connect(user1)
          .callStatic.swapTokensForTokensCrossChain(
            token1.address,
            AddressZero,
            0,
            parseUnits('3001', 6),
            parseEther('2900'),
            parseEther('2900'),
            user1.address,
            0,
            0
          )
      ).to.be.revertedWithCustomError(coreV3, 'CORE_COV_RATIO_LIMIT_EXCEEDED')

      // verify the return value
      const result = await pool
        .connect(user1)
        .callStatic.swapTokensForTokensCrossChain(
          token1.address,
          AddressZero,
          0,
          parseUnits('2900', 6),
          parseEther('1400'),
          parseEther('1400'),
          user1.address,
          0,
          0
        )
      expect(result.creditAmount).to.eq(parseEther('1496.551127801305489021'))
      expect(result.fromTokenHaircut).to.eq(parseUnits('1401.666666', 6))

      // verify quote function
      const { creditAmount, feeInFromToken } = await pool.quoteSwapTokensForCredit(
        token1.address,
        parseUnits('2900', 6)
      )
      expect(creditAmount).to.be.equal(result.creditAmount)
      expect(feeInFromToken).to.be.equal(result.fromTokenHaircut)

      const balanceBefore = (await token1.balanceOf(user1.address)) as BigNumber
      const creditBefore = (await pool.totalCreditMinted()) as BigNumber
      await pool.setFeeTo(owner.address)
      const receipt = await pool
        .connect(user1)
        .swapTokensForTokensCrossChain(
          token1.address,
          AddressZero,
          0,
          parseUnits('2900', 6),
          parseEther('1400'),
          parseEther('1400'),
          user1.address,
          0,
          0
        )

      await expect(receipt)
        .to.emit(pool, 'SwapTokensForCredit')
        .withArgs(user1.address, token1.address, parseUnits('2900', 6), result.fromTokenHaircut, result.creditAmount)

      const creditAfter = (await pool.totalCreditMinted()) as BigNumber
      expect(creditAfter.sub(creditBefore)).to.eq(result.creditAmount)

      const balanceAfter = (await token1.balanceOf(user1.address)) as BigNumber
      expect(balanceBefore.sub(balanceAfter)).eq(parseUnits('2900', 6))
    })

    it.skip('swapCreditForTokensCrossChain', async function () {
      // not applicable
    })

    it.skip('completeSwapCreditForTokens', async function () {
      // not applicable
    })
  })
})
