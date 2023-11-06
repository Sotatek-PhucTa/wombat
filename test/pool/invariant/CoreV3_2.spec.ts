import { expect } from 'chai'
import { ethers } from 'hardhat'
import _ from 'lodash'
import { CoreV3 } from '../../../build/typechain'
import { formatEther, parseEther } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'

describe('CoreV3 (2)', function () {
  let core: CoreV3

  const tvl = parseEther('1000')
  const swapAmount = parseEther('1')

  interface TestParam {
    amp: number
    cov: number
    expectedCredit: BigNumber
    expectedToken: BigNumber
  }

  // deploy once only since this is stateless
  before(async function () {
    core = (await ethers.deployContract('CoreV3')) as CoreV3
  })

  const testParams: TestParam[] = [
    // wom pools amp
    { amp: 0.1, cov: 70, expectedCredit: parseEther('1.0943'), expectedToken: parseEther('0.9133') },
    { amp: 0.1, cov: 100, expectedCredit: parseEther('0.9999'), expectedToken: parseEther('0.9999') },
    { amp: 0.1, cov: 130, expectedCredit: parseEther('0.9628'), expectedToken: parseEther('1.0385') },

    // dynamic pools amp
    { amp: 0.002, cov: 70, expectedCredit: parseEther('1.0020'), expectedToken: parseEther('0.9979') },
    { amp: 0.002, cov: 100, expectedCredit: parseEther('0.9999'), expectedToken: parseEther('0.9999') },
    { amp: 0.002, cov: 130, expectedCredit: parseEther('0.9991'), expectedToken: parseEther('1.0008') },

    // factory pools amp
    { amp: 0.00125, cov: 70, expectedCredit: parseEther('1.0012'), expectedToken: parseEther('0.9986') },
    { amp: 0.00125, cov: 100, expectedCredit: parseEther('0.9999'), expectedToken: parseEther('0.9999') },
    { amp: 0.00125, cov: 130, expectedCredit: parseEther('0.9994'), expectedToken: parseEther('1.0005') },

    // main pools amp
    { amp: 0.00025, cov: 70, expectedCredit: parseEther('1.0002'), expectedToken: parseEther('0.9997') },
    { amp: 0.00025, cov: 100, expectedCredit: parseEther('0.9999'), expectedToken: parseEther('0.9999') },
    { amp: 0.00025, cov: 130, expectedCredit: parseEther('0.9998'), expectedToken: parseEther('1.0001') },
  ]

  describe('token->credit', function () {
    testParams.map(({ amp, cov, expectedCredit }: TestParam) => {
      it(`At A=${amp} and cov=${cov}%, 1 token -> ${formatEther(expectedCredit)} credit`, async function () {
        expect(
          await core.swapToCreditQuote(tvl.mul(cov).div(100), tvl, swapAmount, parseEther(amp.toString()))
        ).to.closeTo(expectedCredit, parseEther('0.0001'))
      })
    })
  })

  describe('credit->token', function () {
    testParams.map(({ amp, cov, expectedToken }: TestParam) => {
      it(`At A=${amp} and cov=${cov}%, 1 credit -> ${formatEther(expectedToken)} token`, async function () {
        expect(
          await core.swapFromCreditQuote(tvl.mul(cov).div(100), tvl, swapAmount, parseEther(amp.toString()))
        ).to.closeTo(expectedToken, parseEther('0.0001'))
      })
    })
  })

  describe('token->credit->token', function () {
    testParams.map(({ amp, cov }: TestParam) => {
      it(`At A=${amp} and cov=${cov}%, roundtrip close to original token`, async function () {
        const credit = await core.swapToCreditQuote(tvl.mul(cov).div(100), tvl, swapAmount, parseEther(amp.toString()))
        const token = await core.swapFromCreditQuote(tvl.mul(cov).div(100), tvl, credit, parseEther(amp.toString()))
        if (amp < 0.1) {
          // 1bps delta
          expect(token).to.closeTo(swapAmount, parseEther('0.0001'))
        } else {
          // A=0.1, 5bps delta
          expect(token).to.closeTo(swapAmount, parseEther('0.0005'))
        }
      })
    })
  })

  describe('quoteSwap', function () {
    testParams.map(({ amp, cov }: TestParam) => {
      it(`At A=${amp} and cov=${cov}%, swap close to 1 token`, async function () {
        const token = await core.swapQuoteFunc(
          tvl.mul(cov).div(100), // fromCash
          tvl.mul(cov).div(100), // toCash
          tvl, // fromLiability
          tvl, // toLiability
          swapAmount,
          parseEther(amp.toString())
        )
        if (amp < 0.1) {
          // 1bps delta
          expect(token).to.closeTo(swapAmount, parseEther('0.0001'))
        } else {
          // A=0.1, 5bps delta
          expect(token).to.closeTo(swapAmount, parseEther('0.0005'))
        }
      })
    })
  })
})
