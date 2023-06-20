import { Deployment, IWormholeAdaptorConfig, IWormholeConfig, Network, PartialRecord, PoolName } from '../types'
import { Token } from './token'
import { injectForkNetwork } from './pools.config'

export const WORMHOLE_CONFIG_MAPS: PartialRecord<Network, IWormholeConfig> = injectForkNetwork<IWormholeConfig>({
  [Network.BSC_TESTNET]: {
    relayer: '0xda2592C43f2e10cBBA101464326fb132eFD8cB09',
    wormholeBridge: '0x68605AD7b15c732a30b1BbC62BE8F2A509D74b4D',
    consistencyLevel: 15,
  },
  [Network.AVALANCHE_TESTNET]: {
    relayer: '0xDDe6b89B7d0AD383FafDe6477f0d300eC4d4033e',
    wormholeBridge: '0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C',
    consistencyLevel: 1,
  },
  [Network.LOCALHOST]: {
    relayer: '0x0000000000000000000000000000000000000000',
    wormholeBridge: '0x0000000000000000000000000000000000000000',
    consistencyLevel: 1,
  },
  [Network.HARDHAT]: {
    relayer: '0x0000000000000000000000000000000000000000',
    wormholeBridge: '0x0000000000000000000000000000000000000000',
    consistencyLevel: 1,
  },
})

export const WORMHOLE_ADAPTOR_CONFIG_MAP: PartialRecord<
  Network,
  Record<PoolName, IWormholeAdaptorConfig>
> = injectForkNetwork<Record<PoolName, IWormholeAdaptorConfig>>({
  [Network.BSC_TESTNET]: {
    stablecoinPool: {
      adaptorAddr: Deployment('WormholeAdaptor_stablecoinPool_Proxy'),
      tokens: [Token.BUSD, Token.vUSDC],
    },
  },
  [Network.AVALANCHE_TESTNET]: {
    stablecoinPool: {
      adaptorAddr: Deployment('WormholeAdaptor_stablecoinPool_Proxy'),
      tokens: [Token.BUSD, Token.vUSDC],
    },
  },
})
