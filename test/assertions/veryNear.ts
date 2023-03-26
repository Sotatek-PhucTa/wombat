// Custom method : being near means being within the expected variance determined by MAX_VARIANCE
import { BigNumber } from '@ethersproject/bignumber'
import { BigNumberish } from 'ethers'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Chai {
    interface Assertion {
      veryNear(actual: BigNumber, error: BigNumberish): void
    }
  }
}

export function veryNear(chai: Chai.ChaiStatic): void {
  const Assertion = chai.Assertion
  Assertion.addMethod('veryNear', function (actual: BigNumber, error: BigNumberish = 10): void {
    const expected = (this._obj as BigNumber).abs()
    const diff: BigNumber = expected.sub(actual).abs()
    this.assert(
      diff.lte(error),
      'expected #{exp} to be very near to #{act}',
      'expected #{exp} to not to be very near to #{act}',
      String(expected),
      String(actual)
    )
  })
}
