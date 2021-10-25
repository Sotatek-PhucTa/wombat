import { ethers } from 'hardhat'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { ContractFactory, BigNumber } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const { expect } = chai

chai.use(solidity)

describe('CoreV2', function () {
  let owner: SignerWithAddress
  let CoreTest: ContractFactory

  // Declare initial variables
  let Ax: BigNumber // asset of token x
  let Ay: BigNumber // asset of token y
  let Lx: BigNumber // liability of token x
  let Ly: BigNumber // liability of token y
  let Rx: BigNumber // asset coverage ratio of token x
  let D: BigNumber // invariant constant
  let Dx: BigNumber // delta for token x, i.e. token x amount inputted
  let Dy: BigNumber // delta for token y
  let A: BigNumber // amplification factor

  beforeEach(async function () {
    const [first] = await ethers.getSigners()
    owner = first

    // Get CoreTest
    CoreTest = await ethers.getContractFactory('TestCoreV2')
    // First, deploy and initialize pool
    this.coreTest = await CoreTest.connect(owner).deploy()

    // Wait for transaction to be deployed
    await this.coreTest.deployTransaction.wait()

    // Setup initial variables
    Ax = ethers.utils.parseUnits('10000', 18) // 10000
    Ay = ethers.utils.parseUnits('1000', 18) // 1000
    Lx = ethers.utils.parseUnits('10000', 18) // 10000
    Ly = ethers.utils.parseUnits('1000', 18) // 1000
    Rx = ethers.utils.parseUnits('1.01', 18) // 1.01
    D = ethers.utils.parseUnits('10450', 18) // 10450
    Dx = ethers.utils.parseUnits('100', 18) // 100 token x swap amount inputted
    A = ethers.utils.parseUnits('0.05', 18) // 0.05
  })

  describe('[swapQuoteFunc] - public swap quote function for _swapQuoteFunc', async function () {
    it('Should return correct quote given initial variables', async function () {
      const result = await this.coreTest.testSwapQuoteFunc(Ax, Ay, Lx, Ly, D, Dx, A)
      // console.log(52, result.toString()) // 99430096462356289000

      expect(result).to.be.equal(ethers.utils.parseUnits('99.430096462356289000', 18))
    })
  })

  describe('[_swapQuoteFunc] - return quote for amount of token y swapped for token x amount inputted', async function () {
    it('Should return correct quote given initial variables', async function () {
      Dy = ethers.utils.parseUnits('-99.430096462356289000', 18)
      const result = await this.coreTest.test_swapQuoteFunc(Dy, Ay)
      // console.log(62, result.toString()) // 99430096462356289000
      expect(result).to.be.equal(ethers.utils.parseUnits('99.430096462356289000', 18))
    })
  })

  describe('[_deltaFunc] - return the delta for token y ("Dy") based on its asset coverage ratio', async function () {
    it('Should return correct delta for token y given initial variables', async function () {
      const Ry = ethers.utils.parseUnits('0.900569903537643711', 18)
      const result = await this.coreTest.test_deltaFunc(Ay, Ly, Ry)
      // console.log(71, result.toString()) // -99430096462356289000

      expect(result).to.be.equal(ethers.utils.parseUnits('-99.430096462356289000', 18))
    })
  })

  describe('[_coverageYFunc] - return the asset coverage ratio of token y ("Ry")', async function () {
    it('Should return correct asset coverage ratio given initial variables', async function () {
      const b = ethers.utils.parseUnits('-0.845049504950495050', 18)
      const result = await this.coreTest.test_coverageYFunc(b, A)
      // console.log(81, result.toString()) // 900569903537643711

      expect(result).to.be.equal(ethers.utils.parseUnits('0.900569903537643711', 18))
    })
  })

  describe('[_coverageXFunc] - return the asset coverage ratio of token x ("Rx")', async function () {
    it('Should return correct asset coverage ratio given initial variables', async function () {
      const result = await this.coreTest.test_coverageXFunc(Ax, Lx, Dx)
      // console.log(90, result.toString()) // 1010000000000000000

      expect(result).to.be.equal(ethers.utils.parseUnits('1.01', 18))
    })
  })

  describe('[_coefficientFunc] - return the quadratic equation b coefficient ("b")', async function () {
    it('Should return correct quadratic equation b coefficient given initial variables', async function () {
      const result = await this.coreTest.test_coefficientFunc(Lx, Ly, Rx, D, A)
      // console.log(99, result.toString()) // -845049504950495050

      expect(result).to.be.equal(ethers.utils.parseUnits('-0.845049504950495050', 18))
    })
  })
})
