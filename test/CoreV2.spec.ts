import { ethers } from 'hardhat'
import { parseUnits } from '@ethersproject/units'
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
  })

  describe('[_deltaFunc] - return the delta for token y ("Dy") based on its asset coverage ratio', async function () {
    it('Should return correct delta for token y given initial variables', async function () {
      const Ry = parseUnits('0.900569903537643711', 18)
      const result = await CoreV2.test_deltaFunc(Ay, Ly, Ry)
      // console.log(71, result.toString()) // -99430096462356289000

      expect(result).to.be.equal(parseUnits('-99.430096462356289000', 18))
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

  describe('[_coverageXFunc] - return the asset coverage ratio of token x ("Rx")', async function () {
    it('Should return correct asset coverage ratio given initial variables', async function () {
      const result = await CoreV2.test_coverageXFunc(Ax, Lx, Dx)
      // console.log(90, result.toString()) // 1010000000000000000

      expect(result).to.be.equal(parseUnits('1.01', 18))
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
})
