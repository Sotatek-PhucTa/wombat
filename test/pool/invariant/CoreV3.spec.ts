import { expect } from 'chai'
import { BigNumber, BigNumberish, Contract } from 'ethers'
import { parseEther } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import _ from 'lodash'

describe('CoreV3', function () {
  const ampFactor = parseEther('0.04')
  let core: Contract

  // deploy once only since this is stateless
  before(async function () {
    core = await ethers.deployContract('CoreV3')
  })

  describe('balanced pool', function () {
    ;[100, 1e6, 1e9, 1e12, parseEther('1'), parseEther('5000'), parseEther('100000'), parseEther('1000000')].map(
      (tvl) => {
        it(`balanced pool (${tvl}) at equilibrium`, async function () {
          await Promise.all(
            _.range(0, 100).map((percent) => {
              const swapAmount = BigNumber.from(tvl).mul(percent).div(100)
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

    // expect absolute delta when quote is small; else relative.
    const delta = quote.lt(parseEther('0.1')) ? 1 : quote.div(10000) // 1bps
    expect(quoteFromCredit, 'quoteFromCredit').to.be.closeTo(quote, delta)
  }
})
