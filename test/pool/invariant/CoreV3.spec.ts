import { expect } from 'chai'
import { BigNumber, BigNumberish, Contract } from 'ethers'
import { parseEther } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import { CreateRandom } from '../../../utils/random'
import _ from 'lodash'
import { Random } from 'random/dist/random'

describe('CoreV3', function () {
  const ampFactor = parseEther('0.04')
  let core: Contract
  let random: Random

  // deploy once only since this is stateless
  before(async function () {
    core = await ethers.deployContract('CoreV3')
    const seed = process.env.RANDOM_SEED || new Date().toDateString()
    random = await CreateRandom(seed)
    // to reproduce, use `RANDOM_SEED=... hh test`
    console.log(`initialized random using seed ${seed}`)
  })

  describe('balanced pool', function () {
    ;[100, 1e6, 1e9, 1e12, parseEther('1'), parseEther('5000'), parseEther('100000'), parseEther('1000000')].map(
      (tvl) => {
        it(`balanced pool (${tvl}) at equilibrium`, async function () {
          await Promise.all(
            _.range(0, 100).map((percent) => {
              const bips = random.int(0, 99) // [0, 100)
              const swapAmount = BigNumber.from(tvl)
                .mul(percent)
                .div(100)
                .mul(10000 + bips)
                .div(10000)
              return balancedPoolInvariant(tvl, swapAmount, ampFactor)
            })
          )
        })
      }
    )
  })

  // invariant for a balanced pool where cash and liability are all the same
  async function balancedPoolInvariant(tvl: BigNumberish, swapAmount: BigNumberish, ampFactor: BigNumberish) {
    return invariant(tvl, tvl, tvl, tvl, swapAmount, ampFactor)
  }

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
    const delta = quote.lt(parseEther('0.1')) ? 1 : quote.div(10000) // 1bps
    expect(quoteFromCredit, `invariant failed for (${parameters}) quoteFromCredit`).to.be.closeTo(quote, delta)
  }
})
