import { expect } from 'chai'
import { Asset, Pool } from '../../../config/interface'
import { Token, getTokenDeploymentOrAddress } from '../../../config/token'

describe('CodeGen', function () {
  describe('sanity check', function () {
    it('has pool', function () {
      const pool: Pool = {
        ampFactor: 1,
        haircutRate: 2,
      }
      expect(pool).to.exist
    })

    it('has asset', async function () {
      const asset: Asset = {
        underlyingToken: await getTokenDeploymentOrAddress(Token.WOM),
        name: 'name',
        symbol: 'symbol',
      }
      expect(asset).to.exist
    })
  })
})
