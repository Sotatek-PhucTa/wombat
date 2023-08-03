import { expect } from 'chai'
import { convertTokenPerEpochToTokenPerSec, convertTokenPerSecToTokenPerEpoch } from '../../config/emission'
import { parseEther, parseUnits } from 'ethers/lib/utils'

describe('Emission', function () {
  describe('convertTokenPerEpochToTokenPerSec', function () {
    describe('18 decimals', function () {
      it('converts 1000 token per epoch to 0.0016 token per second and vice versa', function () {
        expect(convertTokenPerEpochToTokenPerSec(parseEther('1000'))).to.eql(parseEther('0.001653439153439153'))
        expect(convertTokenPerSecToTokenPerEpoch(parseEther('0.001653439153439153'))).to.be.closeTo(
          parseEther('1000'),
          parseEther('1')
        )
      })
    })

    describe('6 decimals', function () {
      it('converts 1000 token per epoch to 0.0016 token per second and vice versa', function () {
        expect(convertTokenPerEpochToTokenPerSec(parseUnits('1000', 6))).to.eql(parseUnits('0.001653', 6))
        expect(convertTokenPerSecToTokenPerEpoch(parseUnits('0.001653', 6))).to.be.closeTo(
          parseUnits('1000', 6),
          parseUnits('1', 6)
        )
      })
    })
  })
})
