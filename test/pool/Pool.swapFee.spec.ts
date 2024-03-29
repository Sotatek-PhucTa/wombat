import { ethers } from 'hardhat'
import { parseEther, parseUnits } from '@ethersproject/units'
import chai from 'chai'

import { Contract, ContractFactory } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { CrossChainPool__factory } from '../../build/typechain'
import { restoreOrCreateSnapshot } from '../fixtures/executions'

const { expect } = chai

describe('Pool - Fee', function () {
  let owner: SignerWithAddress
  let user1: SignerWithAddress
  let user2: SignerWithAddress
  let AssetFactory: ContractFactory
  let TestERC20Factory: ContractFactory
  let PoolFactory: ContractFactory
  let poolContract: Contract
  let token0: Contract // BUSD
  let token1: Contract // USDC
  let token2: Contract // CAKE
  let asset0: Contract // BUSD LP
  let asset1: Contract // USDC LP
  let asset2: Contract // CAKE LP
  let lastBlockTime: number
  let fiveSecondsSince: number

  before(async function () {
    const [first, ...rest] = await ethers.getSigners()
    owner = first
    user1 = rest[0]
    user2 = rest[1]

    // Get Factories
    AssetFactory = await ethers.getContractFactory('Asset')
    TestERC20Factory = await ethers.getContractFactory('TestERC20')
    const CoreV4Factory = await ethers.getContractFactory('CoreV4')
    const coreV4 = await CoreV4Factory.deploy()
    PoolFactory = (await ethers.getContractFactory('PoolV4', {
      libraries: { CoreV4: coreV4.address },
    })) as CrossChainPool__factory
  })

  beforeEach(
    restoreOrCreateSnapshot(async function () {
      // get last block time
      const lastBlock = await ethers.provider.getBlock('latest')
      lastBlockTime = lastBlock.timestamp
      fiveSecondsSince = lastBlockTime + 5 * 1000

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

      await poolContract.connect(owner).setFee(0, parseEther('0.8'))
    })
  )

  describe('Various Paths', function () {
    it('should not set fee to 0', async function () {
      await expect(
        poolContract.connect(owner).setFeeTo('0x0000000000000000000000000000000000000000')
      ).to.be.revertedWithCustomError(poolContract, 'WOMBAT_ZERO_ADDRESS')
    })

    it('fee should not collected if retention ratio is 1', async function () {
      await poolContract.connect(owner).setFee(0, parseEther('1'))

      // Transfer 100k of stables to user1
      await token0.connect(owner).transfer(user1.address, parseEther('100000')) // 100k BUSD
      await token1.connect(owner).transfer(user1.address, parseUnits('100000', 8)) // 100k vUSDC
      // Approve max allowance of tokens from users to pool
      await token0.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await token1.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)

      // deposit 10k BUSD and 1k vUSDC to pool
      await poolContract
        .connect(user1)
        .deposit(token0.address, parseEther('10000'), 0, user1.address, fiveSecondsSince, false)
      await poolContract
        .connect(user1)
        .deposit(token1.address, parseUnits('1000', 8), 0, user1.address, fiveSecondsSince, false)

      const beforeFromBalance = await token1.balanceOf(user1.address)
      const beforeToBalance = await token0.balanceOf(user1.address)

      const [quotedAmount] = await poolContract
        .connect(user1)
        .quotePotentialSwap(token1.address, token0.address, parseUnits('100', 8))

      const receipt = await poolContract.connect(user1).swap(
        token1.address,
        token0.address,
        parseUnits('100', 8),
        parseEther('90'), // expect at least 90% of ideal quoted amount
        user1.address,
        fiveSecondsSince
      )
      const afterFromBalance = await token1.balanceOf(user1.address)
      const afterToBalance = await token0.balanceOf(user1.address)

      const tokenSent = afterFromBalance.sub(beforeFromBalance)
      const tokenGot = afterToBalance.sub(beforeToBalance)
      expect(tokenSent).to.be.equal(parseUnits('-100', 8))
      expect(tokenGot).to.be.equal(parseEther('99.479655212388714900'))

      //check if token got is equal to token quoted
      expect(tokenGot).to.be.equal(quotedAmount)

      // check BUSD post swap positions
      expect(await asset0.cash()).to.be.equal(parseEther('9900.480537002412250000'))
      expect(await asset0.liability()).to.be.equal(parseEther('10000'))
      expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('9900.520344787611285100')) // should always equal cash

      // check vUSDC post swap positions
      expect(await asset1.cash()).to.be.equal(parseEther('1100'))
      expect(await asset1.liability()).to.be.equal(parseEther('1000'))
      expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('1100', 8)) // should always equal cash

      await expect(receipt)
        .to.emit(poolContract, 'SwapV2')
        .withArgs(
          user1.address,
          token1.address,
          token0.address,
          parseUnits('100', 8),
          parseEther('99.479655212388714900'),
          parseEther('0.039807785199035100'),
          user1.address
        )

      expect(tokenSent.mul(1e10).add(await asset1.cash())).to.be.equal(parseEther('1000'))
      expect(tokenGot.add(await asset0.cash())).to.be.equal(parseEther('9999.960192214800964900'))

      await poolContract.mintFee(token0.address)
      await poolContract.mintFee(token1.address)
      expect(await asset0.liability()).to.be.equal(parseEther('10000'))
      expect(await asset0.balanceOf(user2.address)).to.be.equal(parseEther('0'))
      expect(await asset1.balanceOf(user2.address)).to.be.equal(parseEther('0'))
    })
  })

  describe('r* = 1: Asset BUSD (18 decimals), vUSDC (6 decimals) and CAKE (18 decimals)', function () {
    beforeEach(async function () {
      // set fee collection address
      await poolContract.connect(owner).setFeeTo(user2.address)

      // Transfer 100k of stables to user1
      await token0.connect(owner).transfer(user1.address, parseEther('100000')) // 100k BUSD
      await token1.connect(owner).transfer(user1.address, parseUnits('100000', 8)) // 100k vUSDC
      await token2.connect(owner).transfer(user1.address, parseEther('100000')) // 100k CAKE
      // Approve max allowance of tokens from users to pool
      await token0.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await token1.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await token2.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)

      // deposit 10k BUSD and 1k vUSDC to pool
      await poolContract
        .connect(user1)
        .deposit(token0.address, parseEther('10000'), 0, user1.address, fiveSecondsSince, false)
      await poolContract
        .connect(user1)
        .deposit(token1.address, parseUnits('1000', 8), 0, user1.address, fiveSecondsSince, false)
      await poolContract
        .connect(user1)
        .deposit(token2.address, parseEther('5000'), 0, user1.address, fiveSecondsSince, false)

      await poolContract.connect(owner).setFee(parseEther('0.8'), 0)

      // approve withdraw
      await asset0.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await asset1.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
    })

    describe('single swap', function () {
      it('works (BUSD -> vUSDC) without haircut fees', async function () {
        // set haircut rate to 0
        poolContract.connect(owner).setHaircutRate(0)
        const beforeFromBalance = await token0.balanceOf(user1.address)
        const beforeToBalance = await token1.balanceOf(user1.address)

        const [quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token0.address, token1.address, parseEther('100'))

        const receipt = await poolContract.connect(user1).swap(
          token0.address,
          token1.address,
          parseEther('100'),
          parseUnits('90', 8), // expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )
        const afterFromBalance = await token0.balanceOf(user1.address)
        const afterToBalance = await token1.balanceOf(user1.address)

        const tokenSent = afterFromBalance.sub(beforeFromBalance)
        const tokenGot = afterToBalance.sub(beforeToBalance)

        expect(tokenSent).to.be.equal(parseEther('-100'))
        expect(tokenGot).to.be.equal(parseUnits('99.43009646', 8))

        // check if quoted amount is the same to actual amount of token got
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('10100'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('10100')) // should always equal cash

        // check vUSDC post swap positions
        expect(await asset1.cash()).to.be.equal(parseEther('900.569903537643711000'))
        expect(await asset1.liability()).to.be.equal(parseEther('1000'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('900.56990354', 8)) // should always equal cash

        await expect(receipt)
          .to.emit(poolContract, 'SwapV2')
          .withArgs(
            user1.address,
            token0.address,
            token1.address,
            parseEther('100'),
            parseUnits('99.43009646', 8),
            0,
            user1.address
          )

        expect(tokenSent.add(await asset0.cash())).to.be.equal(parseEther('10000'))
        expect(tokenGot.mul(1e10).add(await asset1.cash())).to.be.equal(parseEther('999.999999997643711000'))

        await poolContract.mintFee(token0.address)
        await poolContract.mintFee(token1.address)
        expect(await asset1.liability()).to.be.equal(parseEther('1000'))
        expect(await asset0.balanceOf(user2.address)).to.be.equal(parseEther('0'))
        expect(await asset1.balanceOf(user2.address)).to.be.equal(parseEther('0'))
      })

      it('works (vUSDC -> BUSD) with haircut fees and no dividend', async function () {
        // set dividend to 0
        await poolContract.connect(owner).setFee(parseEther('1'), 0)

        const beforeFromBalance = await token1.balanceOf(user1.address)
        const beforeToBalance = await token0.balanceOf(user1.address)

        const [quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token1.address, token0.address, parseUnits('100', 8))

        const receipt = await poolContract.connect(user1).swap(
          token1.address,
          token0.address,
          parseUnits('100', 8),
          parseEther('90'), // expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )
        const afterFromBalance = await token1.balanceOf(user1.address)
        const afterToBalance = await token0.balanceOf(user1.address)

        const tokenSent = afterFromBalance.sub(beforeFromBalance)
        const tokenGot = afterToBalance.sub(beforeToBalance)
        expect(tokenSent).to.be.equal(parseUnits('-100', 8))
        expect(tokenGot).to.be.equal(parseEther('99.479655212388714900'))

        //check if token got is equal to token quoted
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('9900.480537002412250000'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('9900.520344787611285100'))

        // check vUSDC post swap positions
        expect(await asset1.cash()).to.be.equal(parseEther('1100'))
        expect(await asset1.liability()).to.be.equal(parseEther('1000'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('1100', 8)) // should always equal cash

        await expect(receipt)
          .to.emit(poolContract, 'SwapV2')
          .withArgs(
            user1.address,
            token1.address,
            token0.address,
            parseUnits('100', 8),
            parseEther('99.479655212388714900'),
            parseEther('0.039807785199035100'),
            user1.address
          )

        expect(tokenGot.add(await asset0.cash())).to.be.equal(parseEther('9999.960192214800964900'))

        await poolContract.mintFee(token0.address)
        await poolContract.mintFee(token1.address)
        // liability and cash should increase
        expect(await asset0.cash()).to.be.equal(parseEther('9900.520344787611285100'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000.039807976551874150'))
        expect(await asset0.balanceOf(user2.address)).to.be.equal(parseEther('0'))
        expect(await asset1.balanceOf(user2.address)).to.be.equal(parseUnits('0', 8))
        expect((await poolContract.connect(user1).globalEquilCovRatio()).equilCovRatio).to.equal(parseEther('1'))

        expect(tokenGot.add(await asset0.cash()).add(await poolContract.tipBucketBalance(token0.address))).to.be.equal(
          parseEther('10000')
        )
      })

      it('works (BUSD -> vUSDC) with haircut fees and dividend', async function () {
        // set fee collection address
        await poolContract.connect(owner).setFeeTo(user2.address)

        const beforeFromBalance = await token0.balanceOf(user1.address)
        const beforeToBalance = await token1.balanceOf(user1.address)

        const [quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token0.address, token1.address, parseEther('100'))

        expect(await poolContract.tipBucketBalance(token0.address)).to.equal(0)
        expect(await poolContract.tipBucketBalance(token1.address)).to.equal(0)

        const receipt = await poolContract.connect(user1).swap(
          token0.address,
          token1.address,
          parseEther('100'),
          parseUnits('90', 8), // expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )
        const afterFromBalance = await token0.balanceOf(user1.address)
        const afterToBalance = await token1.balanceOf(user1.address)

        const tokenSent = afterFromBalance.sub(beforeFromBalance)
        const tokenGot = afterToBalance.sub(beforeToBalance)

        expect(tokenSent).to.be.equal(parseEther('-100'))
        expect(tokenGot).to.be.equal(parseUnits('99.39032442', 8))

        // check if quoted amount is the same to actual amount of token got
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('10100'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('10100')) // should always equal cash

        // check vUSDC post swap positions
        expect(await asset1.cash()).to.be.equal(parseEther('900.569903537643711000'))
        expect(await asset1.liability()).to.be.equal(parseEther('1000'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('900.60967558', 8))

        await expect(receipt)
          .to.emit(poolContract, 'SwapV2')
          .withArgs(
            user1.address,
            token0.address,
            token1.address,
            parseEther('100'),
            parseUnits('99.39032442', 8),
            parseUnits('0.03977203', 8),
            user1.address
          )

        expect(tokenSent.add(await asset0.cash())).to.be.equal(parseEther('10000'))

        expect(await poolContract.tipBucketBalance(token0.address)).to.equal(0)
        // Non zero value comes from vUSDC has only 8 digits
        expect(await poolContract.tipBucketBalance(token1.address)).to.equal(parseEther('0.000000003771346484'))

        // mint fee
        await poolContract.mintFee(token0.address)
        await poolContract.mintFee(token1.address)

        // liability and cash should increase
        expect(await asset1.cash()).to.be.equal(parseEther('900.601721168511665013'))
        expect(await asset1.liability()).to.be.equal(parseEther('1000.031835907300991560'))
        expect(await asset0.balanceOf(user2.address)).to.be.equal(parseEther('0'))
        expect(await asset1.balanceOf(user2.address)).to.be.equal(parseEther('0'))
        expect(await token1.balanceOf(user2.address)).to.be.equal(parseUnits('0.00795440', 8))
        expect((await poolContract.connect(user1).globalEquilCovRatio()).equilCovRatio).to.equal(parseEther('1'))

        expect(
          tokenGot
            .mul(1e10)
            .add(await asset1.cash())
            .add(await poolContract.tipBucketBalance(token1.address))
            .add((await token1.balanceOf(user2.address)).mul(1e10))
        ).to.be.equal(parseEther('1000'))

        expect(await poolContract.tipBucketBalance(token0.address)).to.equal(0)
        expect(await poolContract.tipBucketBalance(token1.address)).to.equal(parseEther('0.000000011488334987'))
      })

      it('(BUSD -> vUSDC) should respect mintFeeThreshold', async function () {
        await poolContract.connect(owner).setMintFeeThreshold(parseEther('0.05'))

        // first swap
        await poolContract.connect(user1).swap(
          token0.address,
          token1.address,
          parseEther('100'),
          parseUnits('90', 8), // expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('10100'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('10100')) // should always equal cash

        // check vUSDC post swap positions
        expect(await asset1.cash()).to.be.equal(parseEther('900.569903537643711000'))
        expect(await asset1.liability()).to.be.equal(parseEther('1000'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('900.60967558', 8))

        await poolContract
          .connect(user1)
          .deposit(token1.address, parseUnits('0.01', 8), 0, user1.address, fiveSecondsSince, false)

        // mint fee threshold not reached
        expect(await asset1.cash()).to.be.equal(parseEther('900.579903537643711000'))
        expect(await asset1.liability()).to.be.equal(parseEther('1000.010005744258988580'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('900.61967558', 8))
        expect(await poolContract.exchangeRate(token1.address)).to.eq(parseEther('1'))

        // second swap
        await poolContract.connect(user1).swap(
          token0.address,
          token1.address,
          parseEther('100'),
          parseUnits('90', 8), // expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )

        // check balance
        expect(await asset1.cash()).to.be.equal(parseEther('802.511252990394556831'))
        expect(await asset1.liability()).to.be.equal(parseEther('1000.010005744258988580'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('802.59025250', 8))
        expect(await poolContract.exchangeRate(token1.address)).to.eq(parseEther('1'))

        await poolContract
          .connect(user1)
          .deposit(token1.address, parseUnits('0.01', 8), 0, user1.address, fiveSecondsSince, false)

        // mint fee threshold reached, cash should increase
        expect(await asset1.cash()).to.be.equal(parseEther('802.584452589437630573'))
        expect(await asset1.liability()).to.be.equal(parseEther('1000.083411603549830880'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('802.58445261', 8))
        expect(await poolContract.exchangeRate(token1.address)).to.eq(parseEther('1.000063377049540840'))

        // cannot further mint fee
        await poolContract.mintFee(token1.address)
        expect(await asset1.cash()).to.be.equal(parseEther('802.584452589437630573'))
        expect(await asset1.liability()).to.be.equal(parseEther('1000.083411603549830880'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('802.58445261', 8))
        expect(await poolContract.exchangeRate(token1.address)).to.eq(parseEther('1.000063377049540840'))
      })

      it('(BUSD -> vUSDC) mint fee immediately', async function () {
        await poolContract.connect(owner).setMintFeeThreshold(parseEther('0.05'))

        await poolContract.connect(user1).swap(
          token0.address,
          token1.address,
          parseEther('100'),
          parseUnits('90', 8), // expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('10100'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('10100')) // should always equal cash

        // check vUSDC post swap positions
        expect(await asset1.cash()).to.be.equal(parseEther('900.569903537643711000'))
        expect(await asset1.liability()).to.be.equal(parseEther('1000'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('900.60967558', 8))

        await poolContract.mintFee(token0.address)
        await poolContract.mintFee(token1.address)

        // should have mint fee immediately
        expect(await asset1.cash()).to.be.equal(parseEther('900.601721168511665013'))
        expect(await asset1.liability()).to.be.equal(parseEther('1000.031835907300991560'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('900.60172118', 8))

        await poolContract.connect(user1).swap(
          token0.address,
          token1.address,
          parseEther('100'),
          parseUnits('90', 8), // expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )

        // trigger PoolV4._mintAllFees
        await poolContract.setFee(0, 0)

        // mint fee immediately
        expect(await asset1.cash()).to.be.equal(parseEther('802.564403793680869592'))
        expect(await asset1.liability()).to.be.equal(parseEther('1000.063306318385932860'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('802.56440382', 8))
      })

      it('works (BUSD -> vUSDC) with haircut fees, dividend and LP dividend', async function () {
        // set fee collection address
        await poolContract.connect(owner).setFeeTo(user2.address)

        await poolContract.connect(owner).setFee(parseEther('0.7'), parseEther('0.2'))

        const beforeFromBalance = await token0.balanceOf(user1.address)
        const beforeToBalance = await token1.balanceOf(user1.address)

        const [quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token0.address, token1.address, parseEther('100'))

        expect(await poolContract.tipBucketBalance(token0.address)).to.equal(0)
        expect(await poolContract.tipBucketBalance(token1.address)).to.equal(0)

        const receipt = await poolContract.connect(user1).swap(
          token0.address,
          token1.address,
          parseEther('100'),
          parseUnits('90', 8), // expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )
        const afterFromBalance = await token0.balanceOf(user1.address)
        const afterToBalance = await token1.balanceOf(user1.address)

        const tokenSent = afterFromBalance.sub(beforeFromBalance)
        const tokenGot = afterToBalance.sub(beforeToBalance)

        expect(tokenSent).to.be.equal(parseEther('-100'))
        expect(tokenGot).to.be.equal(parseUnits('99.39032442', 8))

        // check if quoted amount is the same to actual amount of token got
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('10100'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('10100')) // should always equal cash

        // check vUSDC post swap positions
        expect(await asset1.cash()).to.be.equal(parseEther('900.569903537643711000'))
        expect(await asset1.liability()).to.be.equal(parseEther('1000'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('900.60967558', 8))

        await expect(receipt)
          .to.emit(poolContract, 'SwapV2')
          .withArgs(
            user1.address,
            token0.address,
            token1.address,
            parseEther('100'),
            parseUnits('99.39032442', 8),
            parseUnits('0.03977203', 8),
            user1.address
          )

        expect(tokenSent.add(await asset0.cash())).to.be.equal(parseEther('10000'))

        expect(await poolContract.tipBucketBalance(token0.address)).to.equal(0)
        // Non zero value comes from vUSDC has only 8 digits
        expect(await poolContract.tipBucketBalance(token1.address)).to.equal(parseEther('0.000000003771346484'))

        // mint fee
        await poolContract.mintFee(token0.address)
        await poolContract.mintFee(token1.address)
        // liability and cash should increase
        expect(await asset1.cash()).to.be.equal(parseEther('900.597743964653170761'))
        expect(await asset1.liability()).to.be.equal(parseEther('1000.027856418958257720'))
        expect(await asset0.balanceOf(user2.address)).to.be.equal(parseEther('0'))
        expect(await asset1.balanceOf(user2.address)).to.be.equal(parseEther('0'))
        expect(await token0.balanceOf(user2.address)).to.be.equal(parseUnits('0', 8))
        expect(await token1.balanceOf(user2.address)).to.be.equal(parseUnits('0.00397720', 8))
        expect((await poolContract.connect(user1).globalEquilCovRatio()).equilCovRatio).to.equal(parseEther('1'))

        expect(
          tokenGot
            .mul(1e10)
            .add(await asset1.cash())
            .add(await poolContract.tipBucketBalance(token1.address))
            .add((await token1.balanceOf(user2.address)).mul(1e10))
        ).to.be.equal(parseEther('1000'))

        expect(await poolContract.tipBucketBalance(token0.address)).to.equal(0)
        expect(await poolContract.tipBucketBalance(token1.address)).to.equal(parseEther('0.007954415346829239'))
      })

      it('works (vUSDC -> BUSD) with haircut fees and dividend + deposit to mint fee', async function () {
        const beforeFromBalance = await token1.balanceOf(user1.address)
        const beforeToBalance = await token0.balanceOf(user1.address)

        const [quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token1.address, token0.address, parseUnits('100', 8))

        const receipt = await poolContract.connect(user1).swap(
          token1.address,
          token0.address,
          parseUnits('100', 8),
          parseEther('90'), // expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )
        const afterFromBalance = await token1.balanceOf(user1.address)
        const afterToBalance = await token0.balanceOf(user1.address)

        const tokenSent = afterFromBalance.sub(beforeFromBalance)
        const tokenGot = afterToBalance.sub(beforeToBalance)
        expect(tokenSent).to.be.equal(parseUnits('-100', 8))
        expect(tokenGot).to.be.equal(parseEther('99.479655212388714900'))

        //check if token got is equal to token quoted
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('9900.480537002412250000'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('9900.520344787611285100'))

        // check vUSDC post swap positions
        expect(await asset1.cash()).to.be.equal(parseEther('1100'))
        expect(await asset1.liability()).to.be.equal(parseEther('1000'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('1100', 8)) // should always equal cash

        await expect(receipt)
          .to.emit(poolContract, 'SwapV2')
          .withArgs(
            user1.address,
            token1.address,
            token0.address,
            parseUnits('100', 8),
            parseEther('99.479655212388714900'),
            parseEther('0.039807785199035100'),
            user1.address
          )

        // deposit to mint fee
        await poolContract.connect(user1).deposit(token0.address, 100000000, 0, user1.address, fiveSecondsSince, false)

        await poolContract.connect(user1).deposit(token1.address, 1000000, 0, user1.address, fiveSecondsSince, false)
        expect(await asset0.cash()).to.be.equal(parseEther('9900.512383230671478080'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000.031846381341622600'))
        expect(await asset0.balanceOf(user2.address)).to.be.equal(parseEther('0'))
        expect(await asset1.balanceOf(user2.address)).to.be.equal(parseUnits('0', 8))
        expect(await token0.balanceOf(user2.address)).to.be.equal(parseEther('0.007961557039807020'))
        expect((await poolContract.connect(user1).globalEquilCovRatio()).equilCovRatio).to.equal(parseEther('1'))
      })

      it('works (vUSDC -> BUSD) with haircut fees and dividend + withdraw to mint fee', async function () {
        const beforeFromBalance = await token1.balanceOf(user1.address)
        const beforeToBalance = await token0.balanceOf(user1.address)

        const [quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token1.address, token0.address, parseUnits('100', 8))

        const receipt = await poolContract.connect(user1).swap(
          token1.address,
          token0.address,
          parseUnits('100', 8),
          parseEther('90'), // expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )
        const afterFromBalance = await token1.balanceOf(user1.address)
        const afterToBalance = await token0.balanceOf(user1.address)

        const tokenSent = afterFromBalance.sub(beforeFromBalance)
        const tokenGot = afterToBalance.sub(beforeToBalance)
        expect(tokenSent).to.be.equal(parseUnits('-100', 8))
        expect(tokenGot).to.be.equal(parseEther('99.479655212388714900'))

        //check if token got is equal to token quoted
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('9900.480537002412250000'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('9900.520344787611285100'))

        // check vUSDC post swap positions
        expect(await asset1.cash()).to.be.equal(parseEther('1100'))
        expect(await asset1.liability()).to.be.equal(parseEther('1000'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('1100', 8)) // should always equal cash

        await expect(receipt)
          .to.emit(poolContract, 'SwapV2')
          .withArgs(
            user1.address,
            token1.address,
            token0.address,
            parseUnits('100', 8),
            parseEther('99.479655212388714900'),
            parseEther('0.039807785199035100'),
            user1.address
          )

        // withdraw to mint fee
        await poolContract.connect(user1).withdraw(token0.address, 1e6, 0, user1.address, fiveSecondsSince)

        await poolContract.connect(user1).withdraw(token1.address, 2e7, 0, user1.address, fiveSecondsSince)

        expect(await asset0.cash()).to.be.equal(parseEther('9900.512383230570482170'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000.031846381240622297'))
        expect(await asset0.balanceOf(user2.address)).to.be.equal(parseEther('0'))
        expect(await asset1.balanceOf(user2.address)).to.be.equal(parseEther('0'))
        expect(await token0.balanceOf(user2.address)).to.be.equal(parseEther('0.007961557039807020'))
        expect((await poolContract.connect(user1).globalEquilCovRatio()).equilCovRatio).to.equal(parseEther('1'))
      })
    })

    describe('multiple swap', function () {
      it('works and collect fee', async function () {
        let beforeFromBalance,
          beforeToBalance,
          quotedAmount,
          receipt,
          afterFromBalance,
          afterToBalance,
          tokenSent,
          tokenGot

        // first swap

        beforeFromBalance = await token0.balanceOf(user1.address)
        beforeToBalance = await token1.balanceOf(user1.address)
        ;[quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token0.address, token1.address, parseEther('100'))

        receipt = await poolContract.connect(user1).swap(
          token0.address,
          token1.address,
          parseEther('100'),
          parseUnits('90', 8), // expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )

        afterFromBalance = await token0.balanceOf(user1.address)
        afterToBalance = await token1.balanceOf(user1.address)

        tokenSent = afterFromBalance.sub(beforeFromBalance)
        tokenGot = afterToBalance.sub(beforeToBalance)

        expect(tokenSent).to.be.equal(parseEther('-100'))
        expect(tokenGot).to.be.equal(parseUnits('99.39032442', 8))

        // check if quoted amount is the same to actual amount of token got
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('10100'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('10100')) // should always equal cash

        // check vUSDC post swap positions
        expect(await asset1.cash()).to.be.equal(parseEther('900.569903537643711000'))
        expect(await asset1.liability()).to.be.equal(parseEther('1000'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('900.60967558', 8))

        await expect(receipt)
          .to.emit(poolContract, 'SwapV2')
          .withArgs(
            user1.address,
            token0.address,
            token1.address,
            parseEther('100'),
            parseUnits('99.39032442', 8),
            parseUnits('0.03977203', 8),
            user1.address
          )

        expect(tokenSent.add(await asset0.cash())).to.be.equal(parseEther('10000'))

        // second swap

        beforeFromBalance = await token0.balanceOf(user1.address)
        beforeToBalance = await token1.balanceOf(user1.address)
        ;[quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token0.address, token1.address, parseEther('500'))

        receipt = await poolContract.connect(user1).swap(
          token0.address,
          token1.address,
          parseEther('500'),
          parseUnits('460', 8), // expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )

        afterFromBalance = await token0.balanceOf(user1.address)
        afterToBalance = await token1.balanceOf(user1.address)

        tokenSent = afterFromBalance.sub(beforeFromBalance)
        tokenGot = afterToBalance.sub(beforeToBalance)

        expect(tokenSent).to.be.equal(parseEther('-500'))
        expect(tokenGot).to.be.equal(parseUnits('464.08565298', 8))

        // check if quoted amount is the same to actual amount of token got
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('10600'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('10600')) // should always equal cash

        // check vUSDC post swap positions
        expect(await asset1.cash()).to.be.equal(parseEther('436.298542009580721000'))
        expect(await asset1.liability()).to.be.equal(parseEther('1000'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('436.52402260', 8))

        await expect(receipt)
          .to.emit(poolContract, 'SwapV2')
          .withArgs(
            user1.address,
            token0.address,
            token1.address,
            parseEther('500'),
            parseUnits('464.08565298', 8),
            parseUnits('0.18570854', 8),
            user1.address
          )

        expect(tokenSent.add(await asset0.cash())).to.be.equal(parseEther('10100'))

        // collect fee

        await poolContract.mintFee(token0.address)
        await poolContract.mintFee(token1.address)

        expect(await asset0.cash()).to.be.equal(parseEther('10600'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset1.cash()).to.be.equal(parseEther('436.478926476137655170'))
        expect(await asset1.liability()).to.be.equal(parseEther('1000.193147436766964410'))
        expect(await asset0.balanceOf(user2.address)).to.be.equal(parseEther('0'))
        expect(await asset1.balanceOf(user2.address)).to.be.equal(parseEther('0'))
        expect(await token1.balanceOf(user2.address)).to.be.equal(parseUnits('0.04509611', 8))

        // third swap

        beforeFromBalance = await token0.balanceOf(user1.address)
        beforeToBalance = await token2.balanceOf(user1.address)
        ;[quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token0.address, token2.address, parseEther('100'))

        receipt = await poolContract.connect(user1).swap(
          token0.address,
          token2.address,
          parseEther('100'),
          parseUnits('90', 8), // expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )

        afterFromBalance = await token0.balanceOf(user1.address)
        afterToBalance = await token2.balanceOf(user1.address)

        tokenSent = afterFromBalance.sub(beforeFromBalance)
        tokenGot = afterToBalance.sub(beforeToBalance)

        expect(tokenSent).to.be.equal(parseEther('-100'))
        expect(tokenGot).to.be.equal(parseEther('99.300937483790043456'))

        // check if quoted amount is the same to actual amount of token got
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('10700'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('10700'))

        // check vUSDC post swap positions
        expect(await asset2.cash()).to.be.equal(parseEther('4900.659326246708640000'))
        expect(await asset2.liability()).to.be.equal(parseEther('5000'))
        expect(await asset2.underlyingTokenBalance()).to.be.equal(parseEther('4900.699062516209956544'))

        await expect(receipt)
          .to.emit(poolContract, 'SwapV2')
          .withArgs(
            user1.address,
            token0.address,
            token2.address,
            parseEther('100'),
            parseEther('99.300937483790043456'),
            parseEther('0.039736269501316544'),
            user1.address
          )

        expect(tokenSent.add(await asset0.cash())).to.be.equal(parseEther('10600'))

        // forth swap

        beforeFromBalance = await token0.balanceOf(user1.address)
        beforeToBalance = await token2.balanceOf(user1.address)
        ;[quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token0.address, token2.address, parseEther('100'))

        receipt = await poolContract.connect(user1).swap(
          token0.address,
          token2.address,
          parseEther('100'),
          parseEther('90'), // expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )

        afterFromBalance = await token0.balanceOf(user1.address)
        afterToBalance = await token2.balanceOf(user1.address)

        tokenSent = afterFromBalance.sub(beforeFromBalance)
        tokenGot = afterToBalance.sub(beforeToBalance)

        expect(tokenSent).to.be.equal(parseEther('-100'))
        expect(tokenGot).to.be.equal(parseEther('99.024690200873512236'))

        // check if quoted amount is the same to actual amount of token got
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('10800'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('10800'))

        // check vUSDC post swap positions
        expect(await asset2.cash()).to.be.equal(parseEther('4801.595010319464230000'))
        expect(await asset2.liability()).to.be.equal(parseEther('5000'))
        expect(await asset2.underlyingTokenBalance()).to.be.equal(parseEther('4801.674372315336444308'))

        await expect(receipt)
          .to.emit(poolContract, 'SwapV2')
          .withArgs(
            user1.address,
            token0.address,
            token2.address,
            parseEther('100'),
            parseEther('99.024690200873512236'),
            parseEther('0.039625726370897764'),
            user1.address
          )

        expect(tokenSent.add(await asset0.cash())).to.be.equal(parseEther('10700'))
        expect(tokenGot.add(await asset2.cash())).to.be.equal(parseEther('4900.619700520337742236'))

        // collect fee
        await poolContract.mintFee(token0.address)
        await poolContract.mintFee(token2.address)
        expect(await asset0.cash()).to.be.equal(parseEther('10800'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset2.cash()).to.be.equal(parseEther('4801.658499916162001446'))
        expect(await asset2.liability()).to.be.equal(parseEther('5000.063494738388559540'))
        expect(await asset0.balanceOf(user2.address)).to.be.equal(parseEther('0'))
        expect(await asset2.balanceOf(user2.address)).to.be.equal(parseEther('0'))
        expect(await token2.balanceOf(user2.address)).to.be.equal(parseEther('0.015872399174442862'))

        expect((await poolContract.connect(user1).globalEquilCovRatio()).equilCovRatio).to.equal(
          parseEther('0.999999999999999999')
        )
      })
    })
  })

  describe('r* = 1: 3 assets', function () {
    beforeEach(async function () {
      // set fee collection address
      await poolContract.connect(owner).setFeeTo(user2.address)

      await poolContract.connect(owner).setAmpFactor(parseEther('0.001'))
      await poolContract.connect(owner).setHaircutRate(parseEther('0.0001'))
      await poolContract.connect(owner).setFee(parseEther('0.8'), 0)

      // Transfer 100k of stables to user1
      await token0.connect(owner).transfer(user1.address, parseEther('100000')) // 100k BUSD
      await token1.connect(owner).transfer(user1.address, parseUnits('100000', 8)) // 100k vUSDC
      await token2.connect(owner).transfer(user1.address, parseEther('100000')) // 100k CAKE
      // Approve max allowance of tokens from users to pool
      await token0.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await token1.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await token2.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)

      // deposit 10k BUSD and 1k vUSDC to pool
      await poolContract
        .connect(user1)
        .deposit(token0.address, parseEther('10000'), 0, user1.address, fiveSecondsSince, false)
      await poolContract
        .connect(user1)
        .deposit(token1.address, parseUnits('5000', 8), 0, user1.address, fiveSecondsSince, false)
      await poolContract
        .connect(user1)
        .deposit(token2.address, parseEther('1000'), 0, user1.address, fiveSecondsSince, false)

      // approve withdraw
      await asset0.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
      await asset1.connect(user1).approve(poolContract.address, ethers.constants.MaxUint256)
    })

    describe('multiple swap', function () {
      it('A = 0.001 and collect fee', async function () {
        let beforeFromBalance,
          beforeToBalance,
          quotedAmount,
          receipt,
          afterFromBalance,
          afterToBalance,
          tokenSent,
          tokenGot

        // first swap

        beforeFromBalance = await token0.balanceOf(user1.address)
        beforeToBalance = await token1.balanceOf(user1.address)
        ;[quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token0.address, token1.address, parseEther('2000'))

        receipt = await poolContract.connect(user1).swap(
          token0.address,
          token1.address,
          parseEther('2000'),
          parseUnits('90', 8), // expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )

        afterFromBalance = await token0.balanceOf(user1.address)
        afterToBalance = await token1.balanceOf(user1.address)

        tokenSent = afterFromBalance.sub(beforeFromBalance)
        tokenGot = afterToBalance.sub(beforeToBalance)

        expect(tokenSent).to.be.equal(parseEther('-2000'))
        expect(tokenGot).to.be.equal(parseUnits('1998.13811379', 8))

        // check if quoted amount is the same to actual amount of token got
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('12000'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('12000')) // should always equal cash

        // check vUSDC post swap positions
        expect(await asset1.cash()).to.be.equal(parseEther('3001.662052410792825000'))
        expect(await asset1.liability()).to.be.equal(parseEther('5000'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('3001.86188621', 8)) // should equals to cash + fee

        await expect(receipt)
          .to.emit(poolContract, 'SwapV2')
          .withArgs(
            user1.address,
            token0.address,
            token1.address,
            parseEther('2000'),
            parseUnits('1998.13811379', 8),
            parseUnits('0.19983379', 8),
            user1.address
          )

        expect(tokenSent.add(await asset0.cash())).to.be.equal(parseEther('10000'))

        // second swap

        beforeFromBalance = await token0.balanceOf(user1.address)
        beforeToBalance = await token1.balanceOf(user1.address)
        ;[quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token0.address, token1.address, parseEther('2000'))

        receipt = await poolContract.connect(user1).swap(
          token0.address,
          token1.address,
          parseEther('2000'),
          parseUnits('1800', 8), // expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )

        afterFromBalance = await token0.balanceOf(user1.address)
        afterToBalance = await token1.balanceOf(user1.address)

        tokenSent = afterFromBalance.sub(beforeFromBalance)
        tokenGot = afterToBalance.sub(beforeToBalance)

        expect(tokenSent).to.be.equal(parseEther('-2000'))
        expect(tokenGot).to.be.equal(parseUnits('1984.73210519', 8))

        // check if quoted amount is the same to actual amount of token got
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('14000'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('14000')) // should always equal cash

        // check vUSDC post swap positions
        expect(await asset1.cash()).to.be.equal(parseEther('1016.731454159045530000'))
        expect(await asset1.liability()).to.be.equal(parseEther('5000'))
        expect(await asset1.underlyingTokenBalance()).to.be.equal(parseUnits('1017.12978102', 8)) // should always equal cash

        await expect(receipt)
          .to.emit(poolContract, 'SwapV2')
          .withArgs(
            user1.address,
            token0.address,
            token1.address,
            parseEther('2000'),
            parseUnits('1984.73210519', 8),
            parseUnits('0.19849305', 8),
            user1.address
          )

        expect(tokenSent.add(await asset0.cash())).to.be.equal(parseEther('12000'))
        expect(tokenGot.mul(1e10).add(await asset1.cash())).to.be.equal(parseEther('3001.463559349045530000'))

        // third swap
        beforeFromBalance = await token2.balanceOf(user1.address)
        beforeToBalance = await token0.balanceOf(user1.address)
        ;[quotedAmount] = await poolContract
          .connect(user1)
          .quotePotentialSwap(token2.address, token0.address, parseEther('0.01'))

        receipt = await poolContract.connect(user1).swap(
          token2.address,
          token0.address,
          parseEther('0.01'),
          parseEther('0.008'), // expect at least 90% of ideal quoted amount
          user1.address,
          fiveSecondsSince
        )

        afterFromBalance = await token2.balanceOf(user1.address)
        afterToBalance = await token0.balanceOf(user1.address)

        tokenSent = afterFromBalance.sub(beforeFromBalance)
        tokenGot = afterToBalance.sub(beforeToBalance)

        expect(tokenSent).to.be.equal(parseEther('-0.01'))
        expect(tokenGot).to.be.equal(parseEther('0.010003894868374209'))

        // check if quoted amount is the same to actual amount of token got
        expect(tokenGot).to.be.equal(quotedAmount)

        // check BUSD post swap positions
        expect(await asset2.cash()).to.be.equal(parseEther('1000.01'))
        expect(await asset2.liability()).to.be.equal(parseEther('1000'))
        expect(await asset2.underlyingTokenBalance()).to.be.equal(parseEther('1000.01')) // should always equal cash

        // check vUSDC post swap positions
        expect(await asset0.cash()).to.be.equal(parseEther('13999.989995104642090000'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000'))
        expect(await asset0.underlyingTokenBalance()).to.be.equal(parseEther('13999.989996105131625791')) // should always equal cash

        await expect(receipt)
          .to.emit(poolContract, 'SwapV2')
          .withArgs(
            user1.address,
            token2.address,
            token0.address,
            parseEther('0.01'),
            parseEther('0.010003894868374209'),
            parseEther('0.000001000489535791'),
            user1.address
          )

        expect(tokenSent.add(await asset2.cash())).to.be.equal(parseEther('1000'))
        expect(tokenGot.add(await asset0.cash())).to.be.equal(parseEther('13999.999998999510464209'))

        // collect fee
        await poolContract.mintFee(token0.address)
        await poolContract.mintFee(token1.address)
        expect(await asset0.cash()).to.be.equal(parseEther('13999.989995905033718633'))
        expect(await asset0.liability()).to.be.equal(parseEther('10000.000000800456938500'))
        expect(await asset1.cash()).to.be.equal(parseEther('1017.050115642712806358'))
        expect(await asset1.liability()).to.be.equal(parseEther('5000.323508124753405000'))
        expect(await token0.balanceOf(user2.address)).to.be.equal(parseEther('0.000000200097907158'))
        expect(await token1.balanceOf(user2.address)).to.be.equal(parseUnits('0.07966537', 8))
      })
    })
  })
})
