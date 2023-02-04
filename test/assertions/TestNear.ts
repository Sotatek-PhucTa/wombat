import chai from 'chai'
import { expect } from 'chai'
import { parseEther, parseUnits } from '@ethersproject/units'

import { near } from './near'

chai.use(near)

describe('Testing Near Assert', function () {
  it('should detect variance 18 d.p', async function () {
    const a = parseEther('1000')
    const b = parseEther('1001')
    const c = parseEther('999')
    const d = parseEther('1001.1')
    const e = parseEther('998.999999999')

    expect(a).to.be.near(a)
    expect(a).to.be.near(b)
    expect(a).to.be.near(c)
    expect(a).to.be.not.near(d) // not near enough
    expect(a).to.be.not.near(e) // not near enough
  })

  it('should detect variance 6 d.p', async function () {
    const a = parseUnits('1000', 6)
    const b = parseUnits('1001', 6)
    const c = parseUnits('999', 6)
    const d = parseUnits('1001.1', 6)
    const e = parseUnits('998.99999', 6)

    expect(a).to.be.near(a)
    expect(a).to.be.near(b)
    expect(a).to.be.near(c)
    expect(a).to.be.not.near(d) // not near enough
    expect(a).to.be.not.near(e) // not near enough
  })
})
