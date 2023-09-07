import { expect } from 'chai'
import { CrossChainPoolType, getOtherAdaptorsInGroup } from '../../config/wormhole.config'
import { Network } from '../../types'

describe('wormhole', function () {
  describe('getOtherAdaptorConfigsInGroup', function () {
    it('returns correct group for hardhat', async function () {
      const others = await getOtherAdaptorsInGroup(CrossChainPoolType.stablecoin, Network.HARDHAT)
      expect(others.length).eq(1)
      expect(others[0].network).to.eq(Network.LOCALHOST)
      expect(others[0].poolType).to.eq(CrossChainPoolType.stablecoin)
    })

    it('Input network config should not be returned', async function () {
      const others = await getOtherAdaptorsInGroup(CrossChainPoolType.stablecoin, Network.HARDHAT)
      others.forEach((el) => {
        expect(el.network).not.eq(Network.HARDHAT)
      })
    })

    it('Different group should not be returned', async function () {
      const others = await getOtherAdaptorsInGroup(CrossChainPoolType.stablecoin, Network.HARDHAT)
      others.forEach((el) => {
        expect([Network.BSC_TESTNET, Network.POLYGON_TESTNET, Network.AVALANCHE_TESTNET]).not.include(el.network)
      })
    })

    it('returns correct group for testnet', async function () {
      const others = await getOtherAdaptorsInGroup(CrossChainPoolType.stablecoin, Network.BSC_TESTNET)
      others.forEach((el) => {
        expect([Network.POLYGON_TESTNET, Network.AVALANCHE_TESTNET]).include(el.network)
        expect(el.poolType).to.eq(CrossChainPoolType.stablecoin)
      })
    })

    it('returns correct group for mainnet', async function () {
      const others = await getOtherAdaptorsInGroup(CrossChainPoolType.stablecoin, Network.BSC_MAINNET)
      others.forEach((el) => {
        expect([
          Network.ETHEREUM_MAINNET,
          Network.ARBITRUM_MAINNET,
          Network.POLYGON_MAINNET,
          Network.BASE_MAINNET,
          Network.AVALANCHE_MAINNET,
          Network.OPTIMISM_MAINNET,
        ]).include(el.network)
        expect(el.poolType).to.eq(CrossChainPoolType.stablecoin)
      })
    })
  })
})
