import { expect } from 'chai'
import { printInterface } from '../../../config/interface/printer'
import dedent from 'dedent'

describe('Printer', function () {
  describe('printInterface', function () {
    it('works for Asset', function () {
      const actual = printInterface({
        contract: 'Asset',
        constructor: [
          { name: 'underlyingToken_', type: 'address' },
          { name: 'name_', type: 'string' },
          { name: 'symbol_', type: 'string' },
        ],
        initialize: [],
      })
      expect(actual).to.eql(dedent`export interface Asset {
                        underlyingToken: DeploymentOrAddress
                        name: string
                        symbol: string
                      }`)
    })

    it('works for Pool', function () {
      const actual = printInterface({
        contract: 'Pool',
        constructor: [],
        initialize: [
          { name: 'ampFactor_', type: 'uint256' },
          { name: 'haircutRate_', type: 'uint256' },
        ],
      })
      expect(actual).to.eql(dedent`export interface Pool {
                                     ampFactor: BigNumberish
                                     haircutRate: BigNumberish
                                   }`)
    })

    it('works for all solidity type', function () {
      // TODO: test all the types
    })
  })
})
