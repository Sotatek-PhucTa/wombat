import { expect } from 'chai'
import { atEpochStart } from '../../config/epoch'

describe('Epoch', () => {
  it('works bsc epoch', function () {
    expect(atEpochStart('2023-01-11T05:55Z')).to.eql(1673416500)
  })

  it('works for arbitrum epoch', function () {
    expect(atEpochStart('2023-03-29T05:55Z')).to.eql(1680069300)
  })

  it('works for epoch at 12 apr', function () {
    expect(atEpochStart('2023-04-12T05:55Z')).to.eql(1681278900)
  })

  it('errs when time is not a whole second', function () {
    expect(() => atEpochStart('2023-01-11T05:55:00.001Z')).to.throw(
      'Date 2023-01-11T05:55:00.001Z is not a whole second'
    )
  })

  it('errs when time not at epoch start', function () {
    expect(() => atEpochStart('2023-04-01T05:55:00Z')).to.throw(
      'Date 2023-04-01T05:55:00Z is not at the start of an epoch'
    )
  })
})
