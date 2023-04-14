import { expect } from 'chai'
import { toInterfaceArg } from '../../../config/interface/types'

describe('types', function () {
  describe('toInterfaceArg', function () {
    it('works for initialize', async function () {
      expect(await toInterfaceArg('Pool')).to.eql({
        contract: 'Pool',
        constructor: [],
        initialize: [
          {
            name: 'ampFactor_',
            type: 'uint256',
          },
          {
            name: 'haircutRate_',
            type: 'uint256',
          },
        ],
      })
    })

    it('works for constructor', async function () {
      expect(await toInterfaceArg('Asset')).to.eql({
        contract: 'Asset',
        constructor: [
          {
            name: 'underlyingToken_',
            type: 'address',
          },
          {
            name: 'name_',
            type: 'string',
          },
          {
            name: 'symbol_',
            type: 'string',
          },
        ],
        initialize: [],
      })
    })

    // TODO: throw error when both constructor and initialize are specified
  })
})
