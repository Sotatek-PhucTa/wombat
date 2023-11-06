import { parseUnits } from '@ethersproject/units'
import chai from 'chai'
import { ethers } from 'hardhat'

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumberish } from 'ethers'
import { parseEther } from 'ethers/lib/utils'
import { CoreV4, MockVolatilePool, RepegHelper, VolatileAsset } from '../../build/typechain'
import { near } from '../assertions/near'
import { restoreOrCreateSnapshot } from '../fixtures/executions'
import { advanceTimeAndBlock } from '../helpers'

const { expect } = chai

chai.use(near)

describe('VolatilePool - Utils', function () {
  let owner: SignerWithAddress
  let coreV4: CoreV4
  let repegHelper: RepegHelper

  async function createPool({
    config,
    assetConfigs,
  }: {
    config?: { ampFactor?: BigNumberish; haircutRate?: BigNumberish; priceAnchorIndex: number }
    assetConfigs: Array<{
      tokenDecimal?: number
      cash?: BigNumberish
      liability?: BigNumberish
      priceScale?: BigNumberish
      oraclePrice?: BigNumberish
    }>
  }) {
    const pool = (await ethers.deployContract('MockVolatilePool', {
      libraries: {
        CoreV4: coreV4.address,
        RepegHelper: repegHelper.address,
      },
    })) as MockVolatilePool
    await pool.initialize(config?.ampFactor ?? parseEther('0.01'), config?.haircutRate ?? parseEther('0.0004'))

    const tokens = []
    const assets = []

    for (const assetConfig of assetConfigs) {
      const tokenDecimal = assetConfig.tokenDecimal ?? 18
      const token = await ethers.deployContract('TestERC20', [
        'token',
        'Test Token',
        tokenDecimal,
        parseUnits('1000000', tokenDecimal),
      ])
      const asset = (await ethers.deployContract('VolatileAsset', [
        token.address,
        'token LP',
        'Test Token LP',
        assetConfig.priceScale ?? parseEther('1'),
      ])) as VolatileAsset

      await asset.setPool(owner.address)
      asset.addCash(assetConfig.cash ?? 0)
      asset.addLiability(assetConfig.liability ?? 0)
      const oraclePrice = assetConfig.oraclePrice
      if (oraclePrice) {
        await asset.setOraclePrice(oraclePrice)
      }

      await asset.setPool(pool.address)
      await pool.addAsset(token.address, asset.address)

      tokens.push(token)
      assets.push(asset)
    }

    const priceAnchorIndex = config?.priceAnchorIndex ?? 0
    await pool.setPriceAnchor(assets[priceAnchorIndex].address)

    return { pool, tokens, assets }
  }

  beforeEach(
    restoreOrCreateSnapshot(async function () {
      ;[owner] = await ethers.getSigners()

      coreV4 = (await ethers.deployContract('CoreV4')) as CoreV4
      repegHelper = (await ethers.deployContract('RepegHelper')) as RepegHelper
    })
  )

  describe('Queries', function () {
    it('estimateNewGlobalEquilCovRatio', async function () {
      const { pool, assets } = await createPool({
        config: { priceAnchorIndex: 1 },
        assetConfigs: [
          { cash: parseEther('500'), liability: parseEther('1000'), oraclePrice: parseEther('1.009'), tokenDecimal: 6 },
          {
            cash: parseEther('500'),
            liability: parseEther('1000'),
            priceScale: parseEther('20'),
            tokenDecimal: 8,
          },
          {
            cash: parseEther('500'),
            liability: parseEther('1000'),
            priceScale: parseEther('100'),
            oraclePrice: parseEther('99.95'),
            tokenDecimal: 12,
          },
        ],
      })

      await pool.setAdjustmentStep(parseEther('0.01'))

      let { proposedGlobalEquilCovRatio } = await pool.estimateNewGlobalEquilCovRatio()
      expect(proposedGlobalEquilCovRatio).to.eq(parseEther('0.5'))

      await pool.addReserve(assets[1].address, parseEther('500'))
      await pool.addReserve(assets[2].address, parseEther('500'))
      ;({ proposedGlobalEquilCovRatio } = await pool.estimateNewGlobalEquilCovRatio())
      expect(proposedGlobalEquilCovRatio).to.eq(parseEther('0.995819234200157946'))
    })

    it('getMarketPrice', async function () {
      const { pool, assets, tokens } = await createPool({
        config: { priceAnchorIndex: 1 },
        assetConfigs: [
          { cash: parseEther('500'), liability: parseEther('1000'), tokenDecimal: 6 },
          { cash: parseEther('1500'), liability: parseEther('1000'), priceScale: parseEther('20'), tokenDecimal: 8 },
          { cash: parseEther('1500'), liability: parseEther('1000'), priceScale: parseEther('100'), tokenDecimal: 12 },
        ],
      })

      // [1 * (1+2.97030%)] / [20 * (1-0.55%)]
      expect(await pool.getMarketPrice(assets[0].address)).to.eq(parseEther('1.035398230088495580'))
      const quoteInWad = (
        await pool.quotePotentialSwap(tokens[0].address, tokens[1].address, parseUnits('1', 6))
      ).potentialOutcome
        .mul(1e10)
        .mul(20)
      expect(await pool.getMarketPrice(assets[0].address)).to.near(quoteInWad)

      // the one for anchor asset is always 1
      expect(await pool.getMarketPrice(assets[1].address)).to.eq(parseEther('20'))

      // = 100 / 20
      expect(await pool.getMarketPrice(assets[2].address)).to.eq(parseEther('100'))
    })

    it('quoteIdealSwapRate', async function () {
      const { pool, assets, tokens } = await createPool({
        config: { priceAnchorIndex: 1 },
        assetConfigs: [
          { cash: parseEther('500'), liability: parseEther('1000'), tokenDecimal: 6 },
          { cash: parseEther('1500'), liability: parseEther('1000'), priceScale: parseEther('20'), tokenDecimal: 8 },
          { cash: parseEther('1500'), liability: parseEther('1000'), priceScale: parseEther('100'), tokenDecimal: 12 },
        ],
      })

      // = [1 * (1+2.97030%)] / [20 * (1-0.55%)]
      expect(await pool.quoteIdealSwapRate(assets[0].address, assets[1].address)).to.eq(
        parseEther('0.051769911504424779')
      )
      const quoteInWad = (
        await pool.quotePotentialSwap(tokens[0].address, tokens[1].address, parseUnits('1', 6))
      ).potentialOutcome.mul(1e10)
      expect(await pool.quoteIdealSwapRate(assets[0].address, assets[1].address)).to.near(quoteInWad)

      // = [1 * (1+2.97030%)] / [100 * (1-0.55%)]
      expect(await pool.quoteIdealSwapRate(assets[0].address, assets[2].address)).to.eq(
        parseEther('0.010353982300884956')
      )

      // = [100 * (1-0.55%)] / [1 * (1+2.97030%)]
      expect(await pool.quoteIdealSwapRate(assets[2].address, assets[0].address)).to.eq(
        parseEther('96.581196581196581154')
      )
    })

    it('getNorm', async function () {
      const { pool } = await createPool({
        config: { priceAnchorIndex: 1 },
        assetConfigs: [
          { cash: parseEther('500'), liability: parseEther('1000'), oraclePrice: parseEther('1.5'), tokenDecimal: 6 },
          {
            cash: parseEther('1500'),
            liability: parseEther('1000'),
            priceScale: parseEther('20'),
            tokenDecimal: 8,
          },
          {
            cash: parseEther('1500'),
            liability: parseEther('1000'),
            priceScale: parseEther('100'),
            oraclePrice: parseEther('90'),
            tokenDecimal: 12,
          },
        ],
      })

      expect(await pool.getNorm()).to.eq(parseEther('0.509901951359278483'))
    })

    it('_getNormalizedAdjustmentStep', async function () {
      const { pool } = await createPool({
        config: { priceAnchorIndex: 1 },
        assetConfigs: [
          { cash: parseEther('500'), liability: parseEther('1000'), oraclePrice: parseEther('1.5'), tokenDecimal: 6 },
          {
            cash: parseEther('1500'),
            liability: parseEther('1000'),
            priceScale: parseEther('20'),
            tokenDecimal: 8,
          },
          {
            cash: parseEther('1500'),
            liability: parseEther('1000'),
            priceScale: parseEther('100'),
            oraclePrice: parseEther('90'),
            tokenDecimal: 12,
          },
        ],
      })

      // 0.0005 / 0.51 = 0.00098
      expect(await pool.getNormalizedAdjustmentStep(parseEther('0.509901951359278483'))).to.eq(
        parseEther('0.000980580675690920')
      )

      // 0.0005 / 0.002 = 0.25; capped by 0.02
      expect(await pool.getNormalizedAdjustmentStep(parseEther('0.002'))).to.eq(parseEther('0.2'))
    })

    it('_getCashValuesWithReserve', async function () {
      const { pool, assets } = await createPool({
        config: { priceAnchorIndex: 1 },
        assetConfigs: [
          { cash: parseEther('500'), liability: parseEther('1000'), oraclePrice: parseEther('1.5'), tokenDecimal: 6 },
          {
            cash: parseEther('1500'),
            liability: parseEther('1000'),
            priceScale: parseEther('20'),
            tokenDecimal: 8,
          },
          {
            cash: parseEther('1500'),
            liability: parseEther('1000'),
            priceScale: parseEther('100'),
            oraclePrice: parseEther('90'),
            tokenDecimal: 12,
          },
        ],
      })

      await pool.addReserve(assets[0].address, parseEther('100'))
      await pool.addReserve(assets[1].address, parseEther('200'))
      await pool.addReserve(assets[2].address, parseEther('300'))

      const cashes = await pool.getCashValuesWithReserve()
      expect(cashes[0]).to.eq(parseEther('600'))
      expect(cashes[1]).to.eq(parseEther('1700'))
      expect(cashes[2]).to.eq(parseEther('1800'))
    })

    it('_getProposedPriceScales', async function () {
      const { pool } = await createPool({
        config: { priceAnchorIndex: 1 },
        assetConfigs: [
          { cash: parseEther('500'), liability: parseEther('1000'), oraclePrice: parseEther('1.5'), tokenDecimal: 6 },
          {
            cash: parseEther('1500'),
            liability: parseEther('1000'),
            priceScale: parseEther('20'),
            tokenDecimal: 8,
          },
          {
            cash: parseEther('1500'),
            liability: parseEther('1000'),
            priceScale: parseEther('100'),
            oraclePrice: parseEther('90'),
            tokenDecimal: 12,
          },
        ],
      })

      const norm = await pool.getNorm()
      const normalizedAdjustmentStep = await pool.getNormalizedAdjustmentStep(norm) // parseEther('0.000980580675690920')
      const proposedPriceScales = await pool.getProposedPriceScales(normalizedAdjustmentStep)

      expect(proposedPriceScales[0]).eq(parseEther('1.000490290337845460'))
      expect(proposedPriceScales[1]).eq(parseEther('20'))
      expect(proposedPriceScales[2]).eq(parseEther('99.990194193243090800'))
    })

    it('_getProposedOraclePrices', async function () {
      const { pool } = await createPool({
        config: { priceAnchorIndex: 1 },
        assetConfigs: [
          { cash: parseEther('500'), liability: parseEther('1000'), oraclePrice: parseEther('1.5'), tokenDecimal: 6 },
          {
            cash: parseEther('1500'),
            liability: parseEther('1000'),
            priceScale: parseEther('20'),
            tokenDecimal: 8,
          },
          {
            cash: parseEther('1500'),
            liability: parseEther('1000'),
            priceScale: parseEther('100'),
            oraclePrice: parseEther('90'),
            tokenDecimal: 12,
          },
        ],
      })

      // Case 1: 10 minutes has passed
      {
        await advanceTimeAndBlock(600)

        // respective market prices:
        // 1.035398230088495580
        // 20
        // 100
        const proposedOraclePrices = await pool.getProposedOraclePrices()

        // 624 seconds passed; It should approch by 0.514; 1.5 -> 1.035398230088495580
        //   expect(proposedOraclePrices[0]).near(parseEther('1.26769911504'))
        expect(proposedOraclePrices[0]).near(parseEther('1.261346835128960133'))

        expect(proposedOraclePrices[1]).near(parseEther('20'))

        // 624 seconds passed; It should approch by 0.514; 90 -> 100
        expect(proposedOraclePrices[2]).near(parseEther('95.136725262938572410'))
      }
      // Case 2: 60 minutes in total has passed
      {
        await advanceTimeAndBlock(3000)

        // respective market prices:
        // 1.035398230088495580
        // 20
        // 100
        const proposedOraclePrices = await pool.getProposedOraclePrices()

        // 3624 seconds passed; It should approch by 0.9848;
        expect(proposedOraclePrices[0]).near(parseEther('1.042459123996010097'))

        expect(proposedOraclePrices[1]).near(parseEther('20'))

        // 624 seconds passed; It should approch by 0.9848
        expect(proposedOraclePrices[2]).near(parseEther('99.848022664466830390'))
      }
    })

    it('_getProposedOraclePrices should prevent oracle manipulation', async function () {
      const { pool } = await createPool({
        config: { priceAnchorIndex: 1 },
        assetConfigs: [
          { cash: parseEther('500'), liability: parseEther('1000'), oraclePrice: parseEther('1.5'), tokenDecimal: 6 },
          {
            cash: parseEther('1500'),
            liability: parseEther('1000'),
            priceScale: parseEther('20'),
            tokenDecimal: 8,
          },
          {
            cash: parseEther('1500'),
            liability: parseEther('1000'),
            priceScale: parseEther('100'),
            oraclePrice: parseEther('90'),
            tokenDecimal: 12,
          },
        ],
      })

      await advanceTimeAndBlock(600)

      // respective market prices:
      // 1.035398230088495580
      // 20
      // 100
      const proposedOraclePrices = await pool.getProposedOraclePrices()

      // 624 seconds passed; It should approch by 0.514; 1.5 -> 1.035398230088495580
      //   expect(proposedOraclePrices[0]).near(parseEther('1.26769911504'))
      expect(proposedOraclePrices[0]).eq(parseEther('1.261346835128960133'))

      expect(proposedOraclePrices[1]).eq(parseEther('20'))

      // 624 seconds passed; It should approch by 0.514; 90 -> 100
      expect(proposedOraclePrices[2]).eq(parseEther('95.136725262938572410'))
    })

    it('checkRepegCondition - verify adjustment step', async function () {
      const { pool } = await createPool({
        config: { priceAnchorIndex: 1 },
        assetConfigs: [
          { cash: parseEther('500'), liability: parseEther('1000'), oraclePrice: parseEther('1.009'), tokenDecimal: 6 },
          {
            cash: parseEther('500'),
            liability: parseEther('1000'),
            priceScale: parseEther('20'),
            tokenDecimal: 8,
          },
          {
            cash: parseEther('500'),
            liability: parseEther('1000'),
            priceScale: parseEther('100'),
            oraclePrice: parseEther('99.95'),
            tokenDecimal: 12,
          },
        ],
      })

      await pool.setAdjustmentStep(parseEther('0.01'))

      // unable to repeg, due to condition 1 failed
      let { canRepeg, proposedGlobalEquilCovRatio } = await pool.checkRepegCondition()
      expect(canRepeg).to.eq(false)
      expect(proposedGlobalEquilCovRatio).to.eq(0)

      // unable to repeg, condition 1 passed but condition 2 failed
      await pool.setAdjustmentStep(parseEther('0.005'))
      ;({ canRepeg, proposedGlobalEquilCovRatio } = await pool.checkRepegCondition())
      expect(canRepeg).to.eq(false)
      expect(proposedGlobalEquilCovRatio).to.eq(parseEther('0.5'))
    })

    it('checkRepegCondition - verify r*', async function () {
      const { pool, assets } = await createPool({
        config: { priceAnchorIndex: 1 },
        assetConfigs: [
          { cash: parseEther('500'), liability: parseEther('1000'), oraclePrice: parseEther('1.009'), tokenDecimal: 6 },
          {
            cash: parseEther('500'),
            liability: parseEther('1000'),
            priceScale: parseEther('20'),
            tokenDecimal: 8,
          },
          {
            cash: parseEther('500'),
            liability: parseEther('1000'),
            priceScale: parseEther('100'),
            oraclePrice: parseEther('99.95'),
            tokenDecimal: 12,
          },
        ],
      })

      await pool.setAdjustmentStep(parseEther('0.005'))
      let { canRepeg, proposedGlobalEquilCovRatio } = await pool.checkRepegCondition()
      expect(canRepeg).to.eq(false)
      expect(proposedGlobalEquilCovRatio).to.eq(parseEther('0.5'))

      await pool.addReserve(assets[1].address, parseEther('500'))
      await pool.addReserve(assets[2].address, parseEther('500'))
      ;({ canRepeg, proposedGlobalEquilCovRatio } = await pool.checkRepegCondition())
      expect(canRepeg).to.eq(false)
      expect(proposedGlobalEquilCovRatio).to.eq(parseEther('0.995819234200157946'))

      await pool.addReserve(assets[1].address, parseEther('50'))
      ;({ canRepeg, proposedGlobalEquilCovRatio } = await pool.checkRepegCondition())
      expect(canRepeg).to.eq(true)
      expect(proposedGlobalEquilCovRatio).to.eq(parseEther('1.004080350751732898'))
    })
  })

  describe('Repeg', function () {
    it('Repeg should check repeg conditions are fulfilled', async function () {
      const { pool, assets } = await createPool({
        config: { priceAnchorIndex: 1 },
        assetConfigs: [
          { cash: parseEther('500'), liability: parseEther('1000'), oraclePrice: parseEther('1.009'), tokenDecimal: 6 },
          {
            cash: parseEther('500'),
            liability: parseEther('1000'),
            priceScale: parseEther('20'),
            tokenDecimal: 8,
          },
          {
            cash: parseEther('500'),
            liability: parseEther('1000'),
            priceScale: parseEther('100'),
            oraclePrice: parseEther('99.95'),
            tokenDecimal: 12,
          },
        ],
      })

      await pool.setAdjustmentStep(parseEther('0.005'))
      let success = await pool.callStatic.attemptRepeg()
      // r* = 0.5
      expect(success).to.eq(false)

      await pool.addReserve(assets[1].address, parseEther('500'))
      await pool.addReserve(assets[2].address, parseEther('500'))
      success = await pool.callStatic.attemptRepeg()
      // r* = 0.99
      expect(success).to.eq(false)

      await pool.addReserve(assets[1].address, parseEther('50'))
      success = await pool.callStatic.attemptRepeg()
      // r* = 1.004
      expect(success).to.eq(true)

      // verify repeg result
      await pool.attemptRepeg()
      expect((await pool.globalEquilCovRatio()).equilCovRatio).to.eq(parseEther('1.004080350751732898'))

      // Hurray!
    })

    it('Repeg should update price scale', async function () {
      const { pool, assets } = await createPool({
        config: { priceAnchorIndex: 1 },
        assetConfigs: [
          { cash: parseEther('500'), liability: parseEther('1000'), oraclePrice: parseEther('1.009'), tokenDecimal: 6 },
          {
            cash: parseEther('500'),
            liability: parseEther('1000'),
            priceScale: parseEther('20'),
            tokenDecimal: 8,
          },
          {
            cash: parseEther('500'),
            liability: parseEther('1000'),
            priceScale: parseEther('100'),
            oraclePrice: parseEther('105'),
            tokenDecimal: 12,
          },
        ],
      })

      await pool.setAdjustmentStep(parseEther('0.005'))
      await pool.addReserve(assets[1].address, parseEther('500'))
      await pool.addReserve(assets[2].address, parseEther('500'))
      await pool.addReserve(assets[1].address, parseEther('25.28'))

      // verify repeg result
      const { proposedScales } = await pool.checkRepegCondition()
      const receipt = await pool.attemptRepeg()

      const txn = await receipt.wait()
      expect(txn).to.emit(pool, 'Repeg')

      // globalEquilCovRatio should change
      expect((await pool.globalEquilCovRatio()).equilCovRatio).to.eq(parseEther('1.000000648659787579'))

      // price scales should be updated
      expect(await assets[0].priceScale()).to.eq(proposedScales[0])
      expect(await assets[1].priceScale()).to.eq(proposedScales[1])
      expect(await assets[2].priceScale()).to.eq(proposedScales[2])

      // reserve should be cleared
      expect((await pool.feeAndReserve(assets[0].address)).reserveForRepegging).to.eq(0)
      expect((await pool.feeAndReserve(assets[1].address)).reserveForRepegging).to.eq(0)
      expect((await pool.feeAndReserve(assets[2].address)).reserveForRepegging).to.eq(0)

      // `proposedGlobalEquilCovRatio` should be less than 1
      expect((await pool.estimateNewGlobalEquilCovRatio()).proposedGlobalEquilCovRatio).to.lt(parseEther('1'))
    })
  })

  describe('Oracle', function () {
    it('_updateOracle', async function () {
      // TODO: imeplement
    })
  })
})
