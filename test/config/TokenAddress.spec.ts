import { expect } from 'chai'
import { deployments } from 'hardhat'
import { getTokenAddress, Token } from '../../types/addresses/token'

describe('TokenAddressConfig', function () {
  it('works for WOM', async function () {
    await deployments.fixture('WombatToken')
    expect(await getTokenAddress(Token.WOM)).to.exist
  })
})
