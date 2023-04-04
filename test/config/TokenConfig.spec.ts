import { expect } from 'chai'
import {
  CROSS_CHAIN_POOL_TOKENS_MAP,
  DYNAMICPOOL_TOKENS_MAP,
  FACTORYPOOL_TOKENS_MAP,
  MOCK_TOKEN_MAP,
} from '../../tokens.config'
import { Network } from '../../types'

describe('Token Config', function () {
  Object.values(Network).map((network) => {
    it(`Mock token config for ${network}`, async function () {
      const MOCK_TOKENS = MOCK_TOKEN_MAP[network as Network] || {}
      for (const [token, mockTokenInfo] of Object.entries(MOCK_TOKENS)) {
        expect(token).to.eq(
          mockTokenInfo.tokenSymbol,
          `token symbol doesn't match: ${token} ${mockTokenInfo.tokenSymbol}`
        )
      }
    })
  })

  Object.values(Network).map((network) => {
    it(`Dynamic pool config for ${network}`, async function () {
      const pools = DYNAMICPOOL_TOKENS_MAP[network as Network] || {}
      for (const [, poolInfo] of Object.entries(pools)) {
        for (const [tokenSymbol, assetInfo] of Object.entries(poolInfo.assets)) {
          expect(tokenSymbol).to.eq(
            assetInfo.tokenSymbol,
            `token symbol should be the same: ${tokenSymbol}, ${assetInfo.tokenSymbol}`
          )
        }
      }
    })
  })

  Object.values(Network).map((network) => {
    it(`Factory pool config for ${network}`, async function () {
      const pools = FACTORYPOOL_TOKENS_MAP[network as Network] || {}
      for (const [, poolInfo] of Object.entries(pools)) {
        for (const [tokenSymbol, assetInfo] of Object.entries(poolInfo.assets)) {
          expect(tokenSymbol).to.eq(
            assetInfo.tokenSymbol,
            `token symbol should be the same: ${tokenSymbol}, ${assetInfo.tokenSymbol}`
          )
        }
      }
    })
  })

  Object.values(Network).map((network) => {
    it(`Cross chain pool config for ${network}`, async function () {
      const pools = CROSS_CHAIN_POOL_TOKENS_MAP[network as Network] || {}
      for (const [, poolInfo] of Object.entries(pools)) {
        for (const [tokenSymbol, assetInfo] of Object.entries(poolInfo.assets)) {
          expect(tokenSymbol).to.eq(
            assetInfo.tokenSymbol,
            `token symbol should be the same: ${tokenSymbol}, ${assetInfo.tokenSymbol}`
          )
        }
      }
    })
  })
})
