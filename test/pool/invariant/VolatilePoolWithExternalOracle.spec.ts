import { parseEther, parseUnits } from '@ethersproject/units'
import { ethers } from 'hardhat'

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import chai, { expect } from 'chai'
import { BigNumber, BigNumberish } from 'ethers'
import { formatEther } from 'ethers/lib/utils'
import {
  Asset,
  CoreV3,
  GovernedPriceFeed,
  PriceFeedAsset,
  TestERC20,
  VolatilePoolWithExternalOracle,
} from '../../../build/typechain'
import { roughlyNear } from '../../assertions/roughlyNear'
import { veryNear } from '../../assertions/veryNear'
import { latest } from '../../helpers'
import { near } from '../../assertions/near'
import { restoreOrCreateSnapshot } from '../../fixtures/executions'

chai.use(near)
chai.use(veryNear)
chai.use(roughlyNear)

/**
 * TODO: generate more random testings against different pool setting and different kind of txns
 */
describe('VolatilePoolWithExternalOracle - invariant', function () {
  let owner: SignerWithAddress
  let users: SignerWithAddress[]
  let coreV3: CoreV3
  let token0: TestERC20 // BUSD
  let token1: TestERC20 // USDC
  let token2: TestERC20 // CAKE
  let fiveSecondsSince: BigNumberish

  before(async function () {
    ;[owner, ...users] = await ethers.getSigners()

    coreV3 = (await ethers.deployContract('CoreV3')) as CoreV3

    token0 = (await ethers.deployContract('TestERC20', [
      'Binance USD',
      'BUSD',
      18,
      parseUnits('1000000', 18),
    ])) as TestERC20
    token1 = (await ethers.deployContract('TestERC20', [
      'Venus USDC',
      'vUSDC',
      8,
      parseUnits('10000000', 8),
    ])) as TestERC20
    token2 = (await ethers.deployContract('TestERC20', [
      'PancakeSwap Token',
      'CAKE',
      18,
      parseUnits('1000000', 18),
    ])) as TestERC20
  })

  beforeEach(async function () {
    const lastBlockTime = await latest()
    fiveSecondsSince = lastBlockTime.add(60)
  })

  async function createPool({
    assetConfig,
  }: {
    assetConfig: { cash: BigNumberish; liability: BigNumberish; underlyingToken: TestERC20 }[]
  }) {
    // create and init pool
    const pool = (await ethers.deployContract('VolatilePoolWithExternalOracle', {
      libraries: { CoreV3: coreV3.address },
    })) as VolatilePoolWithExternalOracle
    await pool.initialize(parseEther('0.2'), parseEther('0.001'))
    await pool.setCovRatioFeeParam(parseEther('2'), parseEther('3'))

    // create and init assets
    const assets = []
    const priceFeeds = []
    for (const config of assetConfig) {
      const asset = (await ethers.deployContract('PriceFeedAsset', [
        config.underlyingToken.address,
        'LP',
        'LP',
      ])) as PriceFeedAsset

      // configure cash & asset
      await asset.setPool(owner.address)
      const decimals = await config.underlyingToken.decimals()
      const amountOfTokenToMint = BigNumber.from(config.cash).div(10 ** (18 - decimals))
      await config.underlyingToken.faucet(amountOfTokenToMint)
      await config.underlyingToken.transfer(asset.address, amountOfTokenToMint)
      await pool.addAsset(config.underlyingToken.address, asset.address)
      await asset.addCash(config.cash)
      await asset.addLiability(config.liability)
      await asset.mint(owner.address, config.liability)

      // create price feed
      const priceFeed = (await ethers.deployContract('GovernedPriceFeed', [
        config.underlyingToken.address,
        parseEther('1'),
        parseEther('1000000'),
      ])) as GovernedPriceFeed
      await asset.setPriceFeed(priceFeed.address)

      await asset.setPool(pool.address)

      assets.push(asset)
      priceFeeds.push(priceFeed)
    }

    return { pool, assets, priceFeeds }
  }

  async function printAsset(asset: Asset) {
    console.log(formatEther(await asset.cash()), formatEther(await asset.liability()))
  }

  describe('r* = 0.477', function () {
    let pool: VolatilePoolWithExternalOracle
    let assets: PriceFeedAsset[]
    let priceFeeds: GovernedPriceFeed[]

    beforeEach(
      restoreOrCreateSnapshot(async function () {
        ;({ pool, assets, priceFeeds } = await createPool({
          assetConfig: [
            { cash: parseEther('150000'), liability: parseEther('100000'), underlyingToken: token0 },
            { cash: parseEther('50'), liability: parseEther('200'), underlyingToken: token1 },
            { cash: parseEther('10000'), liability: parseEther('10000'), underlyingToken: token2 },
          ],
        }))

        await priceFeeds[0].setLatestPrice(parseEther('1.06'))
        await priceFeeds[1].setLatestPrice(parseEther('1200'))

        await token0.approve(pool.address, ethers.constants.MaxUint256)
        await token1.approve(pool.address, ethers.constants.MaxUint256)

        await assets[0].approve(pool.address, ethers.constants.MaxUint256)
        await assets[1].approve(pool.address, ethers.constants.MaxUint256)

        expect((await pool.globalEquilCovRatio()).equilCovRatio).to.be.near(parseEther('0.4775'))
      })
    )

    it('r* is not changed by swaps', async function () {
      const equilCovRatio0 = (await pool.globalEquilCovRatio()).equilCovRatio

      // swap 1
      await pool.swap(token0.address, token1.address, parseEther('100000'), 0, owner.address, fiveSecondsSince)
      const equilCovRatio1 = (await pool.globalEquilCovRatio()).equilCovRatio
      expect(equilCovRatio0).to.be.veryNear(equilCovRatio1, 500)

      // swap 2
      await pool.swap(token1.address, token0.address, parseUnits('100', 8), 0, owner.address, fiveSecondsSince)
      const equilCovRatio2 = (await pool.globalEquilCovRatio()).equilCovRatio
      expect(equilCovRatio1).to.be.veryNear(equilCovRatio2, 500)

      // TODO: compare against the value of `equilCovRatio0` after a lot of txn to assert that error doesn't accumulate
    })

    it('r* is not changed by deposits', async function () {
      const equilCovRatio0 = (await pool.globalEquilCovRatio()).equilCovRatio

      // deposit 1
      await pool.deposit(token0.address, parseEther('30000'), 0, owner.address, fiveSecondsSince, false)
      const equilCovRatio1 = (await pool.globalEquilCovRatio()).equilCovRatio
      expect(equilCovRatio0).to.be.veryNear(equilCovRatio1, 500)

      // deposit 2
      await pool.deposit(token1.address, parseUnits('300', 8), 0, owner.address, fiveSecondsSince, false)
      const equilCovRatio2 = (await pool.globalEquilCovRatio()).equilCovRatio
      expect(equilCovRatio1).to.be.veryNear(equilCovRatio2, 500)

      // TODO: compare against the value of `equilCovRatio0` after a lot of txn to assert that error doesn't accumulate
    })

    it('r* is not changed by withdrawals', async function () {
      const equilCovRatio0 = (await pool.globalEquilCovRatio()).equilCovRatio

      // withdrawal 1
      await pool.withdraw(token0.address, parseEther('30000'), 0, owner.address, fiveSecondsSince)
      const equilCovRatio1 = (await pool.globalEquilCovRatio()).equilCovRatio
      expect(equilCovRatio0).to.be.veryNear(equilCovRatio1, 500)

      // withdrawal 2
      await pool.withdraw(token1.address, parseUnits('100', 8), 0, owner.address, fiveSecondsSince)
      const equilCovRatio2 = (await pool.globalEquilCovRatio()).equilCovRatio
      expect(equilCovRatio1).to.be.veryNear(equilCovRatio2, 500)

      // TODO: compare against the value of `equilCovRatio0` after a lot of txn to assert that error doesn't accumulate
    })

    it('r* is changed by oracle update', async function () {
      const equilCovRatio0 = (await pool.globalEquilCovRatio()).equilCovRatio

      // update oracle
      await priceFeeds[1].setLatestPrice(parseEther('1100'))
      const equilCovRatio1 = (await pool.globalEquilCovRatio()).equilCovRatio
      expect(equilCovRatio0).not.to.be.veryNear(equilCovRatio1, 500)
    })
  })

  describe('r* = 1.638 (floating r*)', function () {
    let pool: VolatilePoolWithExternalOracle
    let assets: PriceFeedAsset[]
    let priceFeeds: GovernedPriceFeed[]

    beforeEach(
      restoreOrCreateSnapshot(async function () {
        ;({ pool, assets, priceFeeds } = await createPool({
          assetConfig: [
            { cash: parseEther('80000'), liability: parseEther('100000'), underlyingToken: token0 },
            { cash: parseEther('130'), liability: parseEther('200'), underlyingToken: token1 },
            { cash: parseEther('2000000'), liability: parseEther('1000000'), underlyingToken: token2 },
          ],
        }))

        await pool.setShouldCapEquilCovRatio(false)

        await priceFeeds[0].setLatestPrice(parseEther('1.06'))
        await priceFeeds[1].setLatestPrice(parseEther('1200'))

        await token0.approve(pool.address, ethers.constants.MaxUint256)
        await token1.approve(pool.address, ethers.constants.MaxUint256)

        await assets[0].approve(pool.address, ethers.constants.MaxUint256)
        await assets[1].approve(pool.address, ethers.constants.MaxUint256)

        expect((await pool.globalEquilCovRatio()).equilCovRatio).to.be.near(parseEther('1.638'))
      })
    )

    it('r* is not changed by swaps', async function () {
      const equilCovRatio0 = (await pool.globalEquilCovRatio()).equilCovRatio

      // swap 1
      await pool.swap(token0.address, token1.address, parseEther('100000'), 0, owner.address, fiveSecondsSince)
      const equilCovRatio1 = (await pool.globalEquilCovRatio()).equilCovRatio
      expect(equilCovRatio0).to.be.veryNear(equilCovRatio1, 500)

      // swap 2
      await pool.swap(token1.address, token0.address, parseUnits('100', 8), 0, owner.address, fiveSecondsSince)
      const equilCovRatio2 = (await pool.globalEquilCovRatio()).equilCovRatio
      expect(equilCovRatio1).to.be.veryNear(equilCovRatio2, 500)

      // TODO: compare against the value of `equilCovRatio0` after a lot of txn to assert that error doesn't accumulate
    })

    it('r* is not changed by deposits', async function () {
      const equilCovRatio0 = (await pool.globalEquilCovRatio()).equilCovRatio

      // deposit 1
      await pool.deposit(token0.address, parseEther('30000'), 0, owner.address, fiveSecondsSince, false)
      const equilCovRatio1 = (await pool.globalEquilCovRatio()).equilCovRatio
      expect(equilCovRatio0).to.be.veryNear(equilCovRatio1, 500)

      // deposit 2
      await pool.deposit(token1.address, parseUnits('300', 8), 0, owner.address, fiveSecondsSince, false)
      const equilCovRatio2 = (await pool.globalEquilCovRatio()).equilCovRatio
      expect(equilCovRatio1).to.be.veryNear(equilCovRatio2, 500)

      // TODO: compare against the value of `equilCovRatio0` after a lot of txn to assert that error doesn't accumulate
    })

    it('r* is not changed by withdrawals', async function () {
      const equilCovRatio0 = (await pool.globalEquilCovRatio()).equilCovRatio

      // withdrawal 1
      await pool.withdraw(token0.address, parseEther('30000'), 0, owner.address, fiveSecondsSince)
      const equilCovRatio1 = (await pool.globalEquilCovRatio()).equilCovRatio
      expect(equilCovRatio0).to.be.veryNear(equilCovRatio1, 500)

      // withdrawal 2
      await pool.withdraw(token1.address, parseUnits('100', 8), 0, owner.address, fiveSecondsSince)
      const equilCovRatio2 = (await pool.globalEquilCovRatio()).equilCovRatio
      expect(equilCovRatio1).to.be.veryNear(equilCovRatio2, 500)

      // TODO: compare against the value of `equilCovRatio0` after a lot of txn to assert that error doesn't accumulate
    })

    it('r* is changed by oracle update', async function () {
      const equilCovRatio0 = (await pool.globalEquilCovRatio()).equilCovRatio

      // update oracle
      await priceFeeds[1].setLatestPrice(parseEther('1100'))
      const equilCovRatio1 = (await pool.globalEquilCovRatio()).equilCovRatio
      expect(equilCovRatio0).not.to.be.veryNear(equilCovRatio1, 500)
    })
  })

  describe('r* = 1.638 (capping r*)', function () {
    let pool: VolatilePoolWithExternalOracle
    let assets: PriceFeedAsset[]
    let priceFeeds: GovernedPriceFeed[]

    beforeEach(
      restoreOrCreateSnapshot(async function () {
        ;({ pool, assets, priceFeeds } = await createPool({
          assetConfig: [
            { cash: parseEther('80000'), liability: parseEther('100000'), underlyingToken: token0 },
            { cash: parseEther('130'), liability: parseEther('200'), underlyingToken: token1 },
            { cash: parseEther('2000000'), liability: parseEther('1000000'), underlyingToken: token2 },
          ],
        }))

        await pool.setShouldCapEquilCovRatio(true)

        await priceFeeds[0].setLatestPrice(parseEther('1.06'))
        await priceFeeds[1].setLatestPrice(parseEther('1200'))

        await token0.approve(pool.address, ethers.constants.MaxUint256)
        await token1.approve(pool.address, ethers.constants.MaxUint256)

        await assets[0].approve(pool.address, ethers.constants.MaxUint256)
        await assets[1].approve(pool.address, ethers.constants.MaxUint256)

        expect((await pool.globalEquilCovRatio()).equilCovRatio).to.be.near(parseEther('1.638'))
      })
    )

    it('r* is not changed by swaps', async function () {
      const equilCovRatio0 = (await pool.globalEquilCovRatio()).equilCovRatio

      // swap 1
      await pool.swap(token0.address, token1.address, parseEther('100000'), 0, owner.address, fiveSecondsSince)
      const equilCovRatio1 = (await pool.globalEquilCovRatio()).equilCovRatio
      expect(equilCovRatio0).to.be.veryNear(equilCovRatio1, 500)

      // swap 2
      await pool.swap(token1.address, token0.address, parseUnits('100', 8), 0, owner.address, fiveSecondsSince)
      const equilCovRatio2 = (await pool.globalEquilCovRatio()).equilCovRatio
      expect(equilCovRatio1).to.be.veryNear(equilCovRatio2, 500)

      // TODO: compare against the value of `equilCovRatio0` after a lot of txn to assert that error doesn't accumulate
    })

    it('r* is changed by deposits', async function () {
      const equilCovRatio0 = (await pool.globalEquilCovRatio()).equilCovRatio

      // deposit 1
      await pool.deposit(token0.address, parseEther('30000'), 0, owner.address, fiveSecondsSince, false)
      const equilCovRatio1 = (await pool.globalEquilCovRatio()).equilCovRatio
      expect(equilCovRatio0).to.not.be.veryNear(equilCovRatio1, 500)

      // deposit 2
      await pool.deposit(token1.address, parseUnits('300', 8), 0, owner.address, fiveSecondsSince, false)
      const equilCovRatio2 = (await pool.globalEquilCovRatio()).equilCovRatio
      expect(equilCovRatio1).to.not.be.veryNear(equilCovRatio2, 500)

      // TODO: compare against the value of `equilCovRatio0` after a lot of txn to assert that error doesn't accumulate
    })

    it('r* is changed by withdrawals', async function () {
      const equilCovRatio0 = (await pool.globalEquilCovRatio()).equilCovRatio

      // withdrawal 1
      await pool.withdraw(token0.address, parseEther('30000'), 0, owner.address, fiveSecondsSince)
      const equilCovRatio1 = (await pool.globalEquilCovRatio()).equilCovRatio
      expect(equilCovRatio0).to.not.be.veryNear(equilCovRatio1, 500)

      // withdrawal 2
      await pool.withdraw(token1.address, parseUnits('100', 8), 0, owner.address, fiveSecondsSince)
      const equilCovRatio2 = (await pool.globalEquilCovRatio()).equilCovRatio
      expect(equilCovRatio1).to.not.be.veryNear(equilCovRatio2, 500)

      // TODO: compare against the value of `equilCovRatio0` after a lot of txn to assert that error doesn't accumulate
    })
  })

  describe('withdrawal haircut', function () {
    let pool: VolatilePoolWithExternalOracle
    let assets: PriceFeedAsset[]
    let priceFeeds: GovernedPriceFeed[]

    beforeEach(
      restoreOrCreateSnapshot(async function () {
        ;({ pool, assets, priceFeeds } = await createPool({
          assetConfig: [
            { cash: parseEther('150000'), liability: parseEther('100000'), underlyingToken: token0 },
            { cash: parseEther('50'), liability: parseEther('200'), underlyingToken: token1 },
            { cash: parseEther('10000'), liability: parseEther('10000'), underlyingToken: token2 },
          ],
        }))

        await priceFeeds[0].setLatestPrice(parseEther('1.06'))
        await priceFeeds[1].setLatestPrice(parseEther('1200'))

        await assets[1].approve(pool.address, ethers.constants.MaxUint256)
        await assets[0].approve(pool.address, ethers.constants.MaxUint256)
      })
    )

    it('withdrawal haircut is applied', async function () {
      // quote withdrawal, haircut = 0.005
      await pool.setWithdrawalHaircutRate(parseEther('0.005'))
      const amount = await pool.quotePotentialWithdraw(token1.address, parseEther('100'))
      expect(
        await pool.callStatic.withdraw(token1.address, parseEther('100'), 0, owner.address, fiveSecondsSince)
      ).to.eq(amount)

      // quote withdrawal, haircut = 0
      await pool.setWithdrawalHaircutRate(0)
      const amount1 = await pool.quotePotentialWithdraw(token1.address, parseEther('100'))
      expect(
        await pool.callStatic.withdraw(token1.address, parseEther('100'), 0, owner.address, fiveSecondsSince)
      ).to.eq(amount1)

      // verify that the haircut is applied
      expect(amount1.mul(199).div(200)).to.be.veryNear(amount, 10)
    })

    it('withdrawal from other asset haircut is applied', async function () {
      // quote withdrawal, haircut = 0.005
      await pool.setWithdrawalHaircutRate(parseEther('0.005'))
      const { finalAmount, withdrewAmount } = await pool.quotePotentialWithdrawFromOtherAsset(
        token0.address,
        token1.address,
        parseEther('100')
      )
      expect(
        await pool.callStatic.withdrawFromOtherAsset(
          token0.address,
          token1.address,
          parseEther('100'),
          0,
          owner.address,
          fiveSecondsSince
        )
      ).to.eq(finalAmount)

      // quote WithdrawFromOtherAsset, haircut = 0
      await pool.setWithdrawalHaircutRate(0)
      const { finalAmount: finalAmount1, withdrewAmount: withdrewAmount1 } =
        await pool.quotePotentialWithdrawFromOtherAsset(token0.address, token1.address, parseEther('100'))
      expect(
        await pool.callStatic.withdrawFromOtherAsset(
          token0.address,
          token1.address,
          parseEther('100'),
          0,
          owner.address,
          fiveSecondsSince
        )
      ).to.eq(finalAmount1)

      // verify that the haircut is applied
      expect(withdrewAmount1.mul(199).div(200)).to.be.veryNear(withdrewAmount, 100)
      expect(finalAmount1.mul(199).div(200)).to.be.roughlyNear(finalAmount)
    })

    it('withdrawal from other asset haircut is applied (reverse direction)', async function () {
      // quote withdrawal, haircut = 0.005
      await pool.setWithdrawalHaircutRate(parseEther('0.005'))
      const { finalAmount, withdrewAmount } = await pool.quotePotentialWithdrawFromOtherAsset(
        token1.address,
        token0.address,
        parseEther('100')
      )
      expect(
        await pool.callStatic.withdrawFromOtherAsset(
          token1.address,
          token0.address,
          parseEther('100'),
          0,
          owner.address,
          fiveSecondsSince
        )
      ).to.eq(finalAmount)

      // quote WithdrawFromOtherAsset, haircut = 0
      await pool.setWithdrawalHaircutRate(0)
      const { finalAmount: finalAmount1, withdrewAmount: withdrewAmount1 } =
        await pool.quotePotentialWithdrawFromOtherAsset(token1.address, token0.address, parseEther('100'))
      expect(
        await pool.callStatic.withdrawFromOtherAsset(
          token1.address,
          token0.address,
          parseEther('100'),
          0,
          owner.address,
          fiveSecondsSince
        )
      ).to.eq(finalAmount1)

      // verify that the haircut is applied
      expect(withdrewAmount1.mul(199).div(200)).to.be.veryNear(withdrewAmount, 100)
      expect(finalAmount1.mul(199).div(200)).to.be.roughlyNear(finalAmount)
    })
  })
})
