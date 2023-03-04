import { expect } from 'chai'
import { BigNumber, BigNumberish, Contract } from 'ethers'
import { formatEther, parseEther } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import { CreateRandom } from '../../../utils/random'
import _ from 'lodash'
import { Random } from 'random/dist/random'

describe('CoreV3', function () {
  const ampFactor = parseEther('0.04')
  let core: Contract
  let random: Random

  // @TODO: Add a function generate random TVL, cov ratio, ampFactor and swapAmount
  // @TODO: Add randomness with pool ampFactor
  const tvlList: BigNumber[] = [
    parseEther('100000'), // 100k
    parseEther('1000000'), // 1 mil
    parseEther('5000000'), // 5 mil
    parseEther('293000000'), // 293 mil
    parseEther('467000000'), // 467 mil
    parseEther('719000000'), // 719 mil
    parseEther('1000000000'), // 1b
  ]

  // deploy once only since this is stateless
  before(async function () {
    core = await ethers.deployContract('CoreV3')
    const seed = process.env.RANDOM_SEED || new Date().toISOString()
    random = await CreateRandom(seed)
    // to reproduce, use `RANDOM_SEED=... hh test`
    console.log(`initialized random using seed ${seed}`)
  })

  describe('balanced pool with 100% cov ratio', function () {
    async function balancedPoolInvariant(tvl: BigNumberish, swapAmount: BigNumberish, ampFactor: BigNumberish) {
      return invariant(tvl, tvl, tvl, tvl, swapAmount, ampFactor)
    }

    tvlList.map((tvl) => {
      it(`balanced pool (${formatEther(tvl)}) at equilibrium`, async function () {
        // perform swap with 0~100% of TVL, plus 0~99 bips in each step.
        await Promise.all(
          _.range(0, 100).map((percent) => {
            const bips = random.int(0, 99) // [0, 100)
            const swapAmount = BigNumber.from(tvl)
              .mul(percent)
              .div(100)
              .mul(10000 + bips)
              .div(10000)
            // also add 0-99% randomness to tvl
            const randomTvl = tvl.mul(100 + bips).div(100)
            return balancedPoolInvariant(randomTvl, swapAmount, ampFactor)
          })
        )
      })
    })
  })

  describe('imbalanced pool with different tvl and 100% cov ratio', function () {
    async function imbalancedPoolInvariant(
      fromTvl: BigNumberish,
      toTvl: BigNumberish,
      swapAmount: BigNumberish,
      ampFactor: BigNumberish
    ) {
      return Promise.all([
        invariant(fromTvl, fromTvl, toTvl, toTvl, swapAmount, ampFactor),
        invariant(toTvl, toTvl, fromTvl, fromTvl, swapAmount, ampFactor),
      ])
    }
    tvlList.map((tvl) => {
      it(`imbalanced pool with random TVL at equilibrium`, async function () {
        // perform swap with 0~100% of TVL, plus 0~99 bips in each step.
        await Promise.all(
          // imbalance pool with 1-10x difference
          _.range(0, 100).flatMap((percent) => {
            return _.range(1, 10).map((ratio) => {
              const bips = random.int(0, 99) // [0, 100)
              const swapAmount = BigNumber.from(tvl)
                .mul(percent)
                .div(100)
                .mul(10000 + bips)
                .div(10000)
              const randomTvl = tvl.mul(100 + bips).div(100)
              return imbalancedPoolInvariant(randomTvl, randomTvl.mul(ratio), swapAmount, ampFactor)
            })
          })
        )
      })
    })
  })

  describe('balanced pool with 1-200% cov ratio', function () {
    async function balancedPoolInvariantWithCov(
      fromAssetCash: BigNumberish,
      fromAssetLiability: BigNumberish,
      toAssetCash: BigNumberish,
      toAssetLiability: BigNumberish,
      swapAmount: BigNumberish,
      ampFactor: BigNumberish
    ) {
      return Promise.all([
        invariant(fromAssetCash, fromAssetLiability, toAssetCash, toAssetLiability, swapAmount, ampFactor),
        invariant(toAssetCash, toAssetLiability, fromAssetCash, fromAssetLiability, swapAmount, ampFactor),
      ])
    }

    tvlList.map(async (tvl) => {
      it(`balanced pool (${formatEther(tvl)}) with 1-200% cov ratio`, async function () {
        // perform swap with 0~100% of TVL, plus 0~99 bips in each step.
        await Promise.all(
          _.range(1, 100).map((percent) => {
            // random cov ratio from 1% ~ 200%
            const fromCovRatio = random.int(100, 20000)
            const toCovRatio = random.int(100, 20000)
            const bips = random.int(0, 99) // [0, 100)
            const swapAmount = BigNumber.from(tvl)
              .mul(percent)
              .div(100)
              .mul(10000 + bips)
              .div(10000)
            const randomTvl = tvl.mul(100 + bips).div(100)

            // same tvl, but different cash and cov ratio
            const fromAssetCash = randomTvl.mul(fromCovRatio).div(10000)
            const toAssetCash = randomTvl.mul(toCovRatio).div(10000)
            return balancedPoolInvariantWithCov(fromAssetCash, randomTvl, toAssetCash, randomTvl, swapAmount, ampFactor)
          })
        )
      })
    })
  })

  describe('imbalanced pool with different tvl with 1-200% cov ratio', function () {
    async function imbalancedPoolInvariantWithCov(
      fromAssetCash: BigNumberish,
      fromAssetLiability: BigNumberish,
      toAssetCash: BigNumberish,
      toAssetLiability: BigNumberish,
      swapAmount: BigNumberish,
      ampFactor: BigNumberish
    ) {
      return Promise.all([
        invariant(fromAssetCash, fromAssetLiability, toAssetCash, toAssetLiability, swapAmount, ampFactor),
        invariant(toAssetCash, toAssetLiability, fromAssetCash, fromAssetLiability, swapAmount, ampFactor),
      ])
    }

    tvlList.map(async (tvl) => {
      it(`imbalanced pool with different tvl and 1-200% cov ratio`, async function () {
        // perform swap with 0~100% of TVL, plus 0~99 bips in each step.
        await Promise.all(
          // imbalance pool with 1-10x difference
          _.range(1, 10).flatMap((ratio) => {
            return _.range(1, 100).map((percent) => {
              // random cov ratio from 1% ~ 200%
              const fromCovRatio = random.int(100, 20000)
              const toCovRatio = random.int(100, 20000)
              const bips = random.int(0, 99) // [0, 100)
              const swapAmount = BigNumber.from(tvl)
                .mul(percent)
                .div(100)
                .mul(10000 + bips)
                .div(10000)
              // different tvl, cash and cov ratio
              const randomFromTvl = tvl.mul(100 + bips).div(100)
              const randomToTvl = randomFromTvl.mul(ratio)
              const fromAssetCash = randomFromTvl.mul(fromCovRatio).div(10000)
              const toAssetCash = randomToTvl.mul(toCovRatio).div(10000)
              return imbalancedPoolInvariantWithCov(
                fromAssetCash,
                randomFromTvl,
                toAssetCash,
                randomToTvl,
                swapAmount,
                ampFactor
              )
            })
          })
        )
      })
    })
  })

  // verify that quote = swapFromCredit(swapToCredit)
  async function invariant(
    fromAssetCash: BigNumberish,
    fromAssetLiability: BigNumberish,
    toAssetCash: BigNumberish,
    toAssetLiability: BigNumberish,
    swapAmount: BigNumberish,
    ampFactor: BigNumberish
  ) {
    // compute quote and swapToCredit first since there are no data dependency
    const [credit, quote] = await Promise.all([
      core.swapToCreditQuote(fromAssetCash, fromAssetLiability, swapAmount, ampFactor),
      core.swapQuoteFunc(fromAssetCash, toAssetCash, fromAssetLiability, toAssetLiability, swapAmount, ampFactor),
    ])
    const quoteFromCredit = await core.swapFromCreditQuote(toAssetCash, toAssetLiability, credit, ampFactor)

    // error message for reproducibility
    const parameters = [
      fromAssetCash,
      fromAssetLiability,
      fromAssetCash,
      fromAssetLiability,
      swapAmount,
      ampFactor,
    ].join(',')
    // expect absolute delta when quote is small; else relative.
    const delta = quote.lt(parseEther('0.1')) ? 5 : quote.div(10000) // 1bps
    expect(quoteFromCredit, `invariant failed for (${parameters}) quoteFromCredit`).to.be.closeTo(quote, delta)
  }
})
