import { ethers } from 'hardhat'
import { parseEther, parseUnits } from '@ethersproject/units'
import { BigNumber } from '@ethersproject/bignumber'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { ContractFactory, Contract } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const { expect } = chai

chai.use(solidity)

describe('CoreV2', function () {
  let owner: SignerWithAddress
  let CoreV2Factory: ContractFactory
  let CoreV2: Contract

  // Declare initial variables
  let Ax: BigNumber // asset of token x
  let Ay: BigNumber // asset of token y
  let Lx: BigNumber // liability of token x
  let Ly: BigNumber // liability of token y
  let Rx: BigNumber // asset coverage ratio of token x
  let D: BigNumber // invariant constant
  let Dx: BigNumber // delta for token x, i.e. token x amount inputted
  let A: BigNumber // amplification factor

  beforeEach(async function () {
    const [first] = await ethers.getSigners()
    owner = first

    // Setup initial variables
    Ax = parseUnits('10000', 18) // 10000
    Ay = parseUnits('1000', 18) // 1000
    Lx = parseUnits('10000', 18) // 10000
    Ly = parseUnits('1000', 18) // 1000
    Rx = parseUnits('1.01', 18) // 1.01
    D = parseUnits('10450', 18) // 10450
    Dx = parseUnits('100', 18) // 100 token x swap amount inputted
    A = parseUnits('0.05', 18) // 0.05

    CoreV2Factory = await ethers.getContractFactory('TestCoreV2')
    CoreV2 = await CoreV2Factory.connect(owner).deploy()

    // Wait for transaction to be mined
    await CoreV2.deployTransaction.wait()
  })

  describe('[swapQuoteFunc] - the swap quote function', async function () {
    it('Should return correct quote given initial variables', async function () {
      const result = await CoreV2.testSwapQuoteFunc(Ax, Ay, Lx, Ly, Dx, A)
      // console.log(52, result.toString()) // 99430096462356289000

      expect(result).to.be.equal(parseUnits('99.430096462356289000', 18))
    })

    it('Should return correct quote given very large amount swap', async function () {
      const result = await CoreV2.testSwapQuoteFunc(Ax, Ay, Lx, Ly, parseUnits('1000', 18), A)

      expect(result).to.be.equal(parseUnits('819.083679854033719000', 18))
    })

    it('Should return very poor quote if input amount x > asset of token x by 2 times', async function () {
      const result = await CoreV2.testSwapQuoteFunc(Ax, Ay, Lx, Ly, parseUnits('2000', 18), A)

      expect(result).to.be.equal(parseUnits('957.477770583431159000', 18))
    })
  })

  describe('[_coverageYFunc] - return the asset coverage ratio of token y ("Ry")', async function () {
    it('Should return correct asset coverage ratio given initial variables', async function () {
      const b = parseUnits('-0.845049504950495050', 18)
      const result = await CoreV2.test_coverageYFunc(b, A)
      // console.log(81, result.toString()) // 900569903537643711

      expect(result).to.be.equal(parseUnits('0.900569903537643711', 18))
    })
  })

  describe('[_coefficientFunc] - return the quadratic equation b coefficient ("b")', async function () {
    it('Should return correct quadratic equation b coefficient given initial variables', async function () {
      const result = await CoreV2.test_coefficientFunc(Lx, Ly, Rx, D, A)
      // console.log(99, result.toString()) // -845049504950495050

      expect(result).to.be.equal(parseUnits('-0.845049504950495050', 18))
    })
  })

  describe('[_invariantFunc] - return the invariant constant ("D")', async function () {
    it('Should return correct invariant constant between token x and y', async function () {
      const result = await CoreV2.test_invariantFunc(Ax, Ay, Lx, Ly, A)
      // console.log(99, result.toString()) // 10450000000000000000000

      expect(result).to.be.equal(parseUnits('10450', 18))
    })
  })

  describe('[_convertToWAD] - return the token amount in WAD units', async function () {
    it('Should return correct token amount for 8 decimal ERC20 token with 18 digit decimal precision', async function () {
      const tokenAmountIn8Decimals = parseUnits('99.43009646', 8) // 9943009646
      const result = await CoreV2.test_convertToWAD(8, tokenAmountIn8Decimals) // 99430096460000000000

      expect(result).to.be.equal(parseUnits('99.43009646', 18))
    })

    it('Should return correct token amount for 24 decimal ERC20 token with 18 digit decimal precision', async function () {
      const tokenAmountIn24Decimals = parseUnits('99.430096464300964643912258', 24) // 99430096464300964643912258
      const result = await CoreV2.test_convertToWAD(24, tokenAmountIn24Decimals) // 99430096464300964643

      expect(result).to.be.equal(parseUnits('99.430096464300964643', 18))
    })
  })

  describe('[_convertFromWAD] - return original token amount with correct decimal numbers', async function () {
    it('Should return correct token amount for 8 decimal ERC20 token', async function () {
      const tokenAmountIn18Decimals = parseUnits('99.430096464300964643', 18) // 9943009646
      const result = await CoreV2.test_convertFromWAD(8, tokenAmountIn18Decimals) // 99430096460000000000

      expect(result).to.be.equal(parseUnits('99.43009646', 8))
    })

    it('Should return correct token amount for 24 decimal ERC20 token', async function () {
      const tokenAmountIn18Decimals = parseUnits('99.430096464300964643', 18) // 99430096464300964643912258
      const result = await CoreV2.test_convertFromWAD(24, tokenAmountIn18Decimals) // 99430096464300964643

      expect(result).to.be.equal(parseUnits('99.430096464300964643000000', 24))
    })
  })

  describe('[depositRewardImpl]', async function () {
    it('withdrawal - edge cases', async function () {
      // test when user withdraw all liquidity in the pool
      expect(
        await CoreV2.test_depositRewardImpl(
          parseEther('999'), // random number
          parseEther('10'),
          parseEther('-10'),
          parseEther('8'),
          parseEther('10'),
          parseEther('0.05')
        )
      ).to.equal(parseEther('2'))

      expect(
        await CoreV2.test_depositRewardImpl(
          parseEther('19'),
          parseEther('20'),
          parseEther('-0.1'),
          parseEther('0.3'),
          parseEther('10'),
          parseEther('0.05')
        )
      ).to.equal(parseEther('-0.092494500389309007'))

      // TODO: add more tests
    })
  })

  describe('[withdrawalAmountInEquilImpl] - return withdrawal amount in equil', async function () {
    describe('withdrawal fee - edge cases', async function () {
      it('1', async function name() {
        expect(
          await CoreV2.test_withdrawalAmountInEquilImpl(
            parseEther('-9.9'),
            parseEther('10'),
            parseEther('10'),
            parseEther('0.001')
          )
        ).to.equal(parseEther('9.9'))
      })

      it('2', async function name() {
        expect(
          await CoreV2.test_withdrawalAmountInEquilImpl(
            parseEther('-9.99999'),
            parseEther('10'),
            parseEther('10'),
            parseEther('0.001')
          )
        ).to.equal(parseEther('9.99999'))
      })
      it('3', async function name() {
        expect(
          await CoreV2.test_withdrawalAmountInEquilImpl(
            parseEther('-10'),
            parseEther('10'),
            parseEther('10'),
            parseEther('0.001')
          )
        ).to.equal(parseEther('10'))
      })

      it('4', async function name() {
        expect(
          await CoreV2.test_withdrawalAmountInEquilImpl(
            parseEther('-15'),
            parseEther('10'),
            parseEther('10'),
            parseEther('0.001')
          )
        ).to.equal(parseEther('9.995000000000000000'))
      })

      it('5', async function name() {
        expect(
          await CoreV2.test_withdrawalAmountInEquilImpl(
            parseEther('-5'),
            parseEther('1'),
            parseEther('10'),
            parseEther('0.001')
          )
        ).to.equal(parseEther('0.993904068469164502'))
      })

      it('6', async function name() {
        expect(
          await CoreV2.test_withdrawalAmountInEquilImpl(
            parseEther('-11'),
            parseEther('1'),
            parseEther('10'),
            parseEther('0.001')
          )
        ).to.equal(parseEther('0.999900883122624183'))
      })

      it('7', async function name() {
        expect(
          await CoreV2.test_withdrawalAmountInEquilImpl(
            parseEther('-5'),
            parseEther('20'),
            parseEther('10'),
            parseEther('0.001')
          )
        ).to.equal(parseEther('4.998333518477377683'))
      })

      it('8', async function name() {
        expect(
          await CoreV2.test_withdrawalAmountInEquilImpl(
            parseEther('-5'),
            parseEther('0.05'),
            parseEther('10'),
            parseEther('0.1')
          )
        ).to.equal(parseEther('0.037772802662532304'))
      })
    })
  })

  describe('[exactDepositLiquidityInEquilImpl] - return exact deposit reward in equil', async function () {
    describe('deposit - edge cases', async function () {
      it('1', async function name() {
        expect(
          await CoreV2.test_exactDepositLiquidityInEquilImpl(
            parseEther('1'),
            parseEther('10'),
            parseEther('10'),
            parseEther('0.001')
          )
        ).to.equal(parseEther('1'))
      })

      it('2', async function name() {
        expect(
          await CoreV2.test_exactDepositLiquidityInEquilImpl(
            parseEther('10'),
            parseEther('10'),
            parseEther('10'),
            parseEther('0.001')
          )
        ).to.equal(parseEther('10'))
      })

      it('3', async function name() {
        expect(
          await CoreV2.test_exactDepositLiquidityInEquilImpl(
            parseEther('10'),
            parseEther('1'),
            parseEther('10'),
            parseEther('0.001')
          )
        ).to.equal(parseEther('10.073442252809457000'))
      })

      it('4', async function name() {
        expect(
          await CoreV2.test_exactDepositLiquidityInEquilImpl(
            parseEther('10'),
            parseEther('100'),
            parseEther('10'),
            parseEther('0.001')
          )
        ).to.equal(parseEther('10.007368324804037000'))
      })

      it('4', async function name() {
        // reward greater than amount
        expect(
          await CoreV2.test_exactDepositLiquidityInEquilImpl(
            parseEther('0.1'),
            parseEther('0.3'),
            parseEther('10'),
            parseEther('0.05')
          )
        ).to.equal(parseEther('1.185771028990578210'))
      })
    })
  })
})
