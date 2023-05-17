import { expect } from 'chai'
import { isChecksumAddress, isSameAddress, toChecksumAddress } from '../../utils/addresses'

describe('addresses', () => {
  const checksumAddress = '0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65'
  const lowerCaseAddress = checksumAddress.toLowerCase()

  describe('isSameAddress', () => {
    it('returns true regardless of case', () => {
      expect(isSameAddress(lowerCaseAddress, lowerCaseAddress)).to.be.true
      expect(isSameAddress(lowerCaseAddress, checksumAddress)).to.be.true
      expect(isSameAddress(checksumAddress, lowerCaseAddress)).to.be.true
      expect(isSameAddress(checksumAddress, checksumAddress)).to.be.true
    })

    it('returns false if addresses are different', () => {
      expect(isSameAddress('0xff970a61a04b1ca14834a43f5de4533ebddb5cc8', '0xff970a61a04b1ca14834a43f5de4533ebddb5cc7'))
        .to.be.false
    })

    it('throws for non-address', () => {
      expect(() => isSameAddress('0xdeadbeef', lowerCaseAddress)).to.throw('invalid address')
    })
  })

  describe('isChecksumAddress', () => {
    it('returns false for lower case address', () => {
      expect(isChecksumAddress(lowerCaseAddress)).to.be.false
    })

    it('returns true for checksum address', () => {
      expect(isChecksumAddress(checksumAddress)).to.be.true
    })

    it('throws for non-address', () => {
      expect(() => isChecksumAddress('0xdeadbeef')).to.throw('invalid address')
    })
  })

  describe('toChecksumAddress', () => {
    it('returns checksum address for lower case address', () => {
      expect(toChecksumAddress(lowerCaseAddress)).to.eql(checksumAddress)
    })

    it('returns checksum address for checksum address', () => {
      expect(toChecksumAddress(checksumAddress)).to.eql(checksumAddress)
    })

    it('throws for non-address', () => {
      expect(() => toChecksumAddress('0xdeadbeef')).to.throw('invalid address')
    })
  })
})
