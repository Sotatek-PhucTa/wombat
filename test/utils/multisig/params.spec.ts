import { BigNumber } from 'ethers'
import { decodeParam, encodeParam } from '../../../utils/multisig/params'
import { expect } from 'chai'

describe('params', function () {
  it('works for number', async function () {
    expect(encodeParam('uint256', 1234)).to.eql('1234')
    expect(decodeParam('uint256', '1234')).to.eql('1234')
  })

  it('works for BigNumber', async function () {
    expect(encodeParam('uint256', BigNumber.from(1234))).to.eql('1234')
    expect(decodeParam('uint256', '1234')).to.eql('1234')
  })

  it('works for string', async function () {
    const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
    expect(encodeParam('address', address)).to.eql(address)
    expect(decodeParam('address', address)).to.eql(address)
  })

  it('works for array of numbers', async function () {
    expect(encodeParam('array', [1234])).to.eql('[1234]')
    expect(decodeParam('uint256[]', '[1234]')).to.eql(['1234'])
  })

  it('works for array of BigNumbers', async function () {
    expect(encodeParam('array', [BigNumber.from(1234)])).to.eql('[1234]')
    expect(decodeParam('uint256[]', '[1234]')).to.eql(['1234'])
  })

  it('works for array of strings', async function () {
    const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
    expect(encodeParam('array', [address])).to.eql('[0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]')
    expect(decodeParam('address[]', '[0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]')).to.eql([address])
  })

  it('does not support 2-d array of numbers', async function () {
    expect(() => encodeParam('array', [[1]])).to.throw('Not implemented for 2-d arrays')
  })
})
