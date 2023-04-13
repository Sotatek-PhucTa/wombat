import { expect } from 'chai'
import { deployments } from 'hardhat'
import { getTokenAddress, Token } from '../../config/token'

describe('TokenAddressConfig', function () {
  it('works for WOM', async function () {
    await deployments.fixture('WombatToken')
    expect(await getTokenAddress(Token.WOM)).to.exist
  })

  it('throws for UNKNOWN', async function () {
    await expect(getTokenAddress(Token.UNKNOWN)).to.be.rejectedWith(
      'No config found for token UNKNOWN in network hardhat'
    )
  })
})
