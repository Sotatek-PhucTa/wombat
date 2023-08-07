import { Deployment, IWormholeAdaptorConfig, IWormholeConfig, Network, PartialRecord, PoolName } from '../types'
import { Token } from './token'
import { injectForkNetwork } from './pools.config'

export const WORMHOLE_CONFIG_MAPS: PartialRecord<Network, IWormholeConfig> = injectForkNetwork<IWormholeConfig>({
  // https://docs.wormhole.com/wormhole/blockchain-environments/evm
  [Network.BSC_MAINNET]: {
    relayer: '0x27428DD2d3DD32A4D7f7C497eAaa23130d894911',
    wormholeBridge: '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B',
  },
  [Network.BSC_TESTNET]: {
    relayer: '0x80aC94316391752A193C1c47E27D382b507c93F3',
    wormholeBridge: '0x68605AD7b15c732a30b1BbC62BE8F2A509D74b4D',
  },
  [Network.AVALANCHE_TESTNET]: {
    relayer: '0xA3cF45939bD6260bcFe3D66bc73d60f19e49a8BB',
    wormholeBridge: '0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C',
  },
  [Network.LOCALHOST]: {
    relayer: '0x0000000000000000000000000000000000000000',
    wormholeBridge: '0x0000000000000000000000000000000000000000',
  },
  [Network.HARDHAT]: {
    relayer: '0x0000000000000000000000000000000000000000',
    wormholeBridge: '0x0000000000000000000000000000000000000000',
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
