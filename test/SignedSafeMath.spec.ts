import { ethers } from 'hardhat'
import { parseUnits } from '@ethersproject/units'
import chai from 'chai'

import { ContractFactory, Contract } from 'ethers'

const { expect } = chai

// skipped as it fails lint
describe('SignedSafeMath', function () {
  let SignedSafeMathFactory: ContractFactory
  let SignedSafeMath: Contract
  before(async function () {
    SignedSafeMathFactory = await ethers.getContractFactory('TestSignedSafeMath')
    SignedSafeMath = await SignedSafeMathFactory.deploy()
    // Wait for transaction to be mined
    await SignedSafeMath.deployTransaction.wait()
  })

  // equivalent to 20000 wei + 33000 wei
  describe('[add] - adds 2 integers', function () {
    it('20000 + 33000 = 53000', async function () {
      expect(await SignedSafeMath.add(20000, 33000)).to.be.equal(53000)
    })

    // 2 very large integers
    it('2 * 10**18 * WAD + 3.3 * 10**18 * WAD = 5.3 * 10**18 * WAD', async function () {
      expect(await SignedSafeMath.add(parseUnits('2', 36), parseUnits('3.3', 36))).to.be.equal(parseUnits('5.3', 36))
    })

    // must use WAD for decimals as no floating point calculation supported in solidity
    it('20000.2 WAD + 33000.3 WAD = 53000.5 WAD', async function () {
      expect(await SignedSafeMath.add(parseUnits('20000.2', 18), parseUnits('33000.3', 18))).to.be.equal(
        parseUnits('53000.5', 18)
      )
    })

    // lowest unit 'wei' does not allow decimals, i.e. 1.2 wei
    it('1.2 + 3.3 = throw underflow error', async function () {
      await expect(SignedSafeMath.add(1.2, 3.3)).to.be.revertedWithPanic
    })
  })

  describe('[sub] - subtracts 2 integers', function () {
    it('53000 - 33000 = 20000', async function () {
      expect(await SignedSafeMath.sub(53000, 33000)).to.be.equal(20000)
    })

    it('53000 WAD - 73000 WAD = -20000 WAD', async function () {
      expect(await SignedSafeMath.sub(parseUnits('5.3', 18), parseUnits('7.3', 18))).to.be.equal(parseUnits('-2', 18))
    })
  })

  describe('[mul] - multiplies 2 integers', function () {
    it('2.2 WAD * 4 = 8.8 WAD', async function () {
      expect(await SignedSafeMath.mul(parseUnits('2.2', 18), '4')).to.be.equal(parseUnits('8.8', 18))
    })

    it('2.2 WAD * -4 = -8.8 WAD', async function () {
      expect(await SignedSafeMath.mul(parseUnits('2.2', 18), '-4')).to.be.equal(parseUnits('-8.8', 18))
    })

    // 2 very large integers
    it('2.2 * 10**18 WAD * 4 WAD = 8.8 * 10**36 * WAD', async function () {
      expect(await SignedSafeMath.mul(parseUnits('2.2', 36), parseUnits('4', 18))).to.be.equal(parseUnits('8.8', 54))
    })
  })

  describe('[div] - divides 2 integers', function () {
    it('8.8 WAD / 4 = 2.2 WAD', async function () {
      expect(await SignedSafeMath.div(parseUnits('8.8', 18), '4')).to.be.equal(parseUnits('2.2', 18))
    })

    it('8.8 WAD / -4 = -2.2 WAD', async function () {
      expect(await SignedSafeMath.div(parseUnits('8.8', 18), '-4')).to.be.equal(parseUnits('-2.2', 18))
    })
  })

  describe('[sqrt] - square roots an integer', function () {
    it('sqrt(9 WAD) = 3 * 10**9', async function () {
      expect(await SignedSafeMath.sqrt(parseUnits('9', 18))).to.be.equal(parseUnits('3', 9))
    })

    it('sqrt(81) = 9', async function () {
      expect(await SignedSafeMath.sqrt(81)).to.be.equal(9)
    })

    // negative integer will default to 1 for square root function
    it('(-9 WAD) = 1', async function () {
      expect(await SignedSafeMath.sqrt(parseUnits('-9', 18))).to.be.equal(1)
    })
  })
})
