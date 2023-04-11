import { expect } from 'chai'
import { convertTokenPerEpochToTokenPerSec } from '../../config/emission'
import { parseEther, parseUnits } from 'ethers/lib/utils'

describe('Emission', function () {
  describe('convertTokenPerEpochToTokenPerSec', function () {
    describe('18 decimals', function () {
      it('converts 1000 token per epoch to 0.0016 token per second', function () {
        expect(convertTokenPerEpochToTokenPerSec(parseEther('1000'))).to.eql(parseEther('0.001653439153439153'))
      })
    })

    describe('6 decimals', function () {
      it('converts 1000 token per epoch to 0.0016 token per second', function () {
        expect(convertTokenPerEpochToTokenPerSec(parseUnits('1000', 6))).to.eql(parseUnits('0.001653', 6))
      })
    })
  })
})
