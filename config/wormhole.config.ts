import { Address, Deployment, IWormholeConfig, Network, PartialRecord } from '../types'
import { injectForkNetwork } from './pools.config'

export const WORMHOLE_CONFIG_MAPS: PartialRecord<Network, IWormholeConfig> = injectForkNetwork<IWormholeConfig>({
  // https://docs.wormhole.com/wormhole/blockchain-environments/evm

  // mainnets
  [Network.BSC_MAINNET]: {
    relayer: Address('0x27428DD2d3DD32A4D7f7C497eAaa23130d894911'),
    wormholeBridge: Address('0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B'),
    chainId: 4,
  },
  [Network.ETHEREUM_MAINNET]: {
    relayer: Address('0x27428DD2d3DD32A4D7f7C497eAaa23130d894911'),
    wormholeBridge: Address('0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B'),
    chainId: 2,
  },
  [Network.ARBITRUM_MAINNET]: {
    relayer: Address('0x27428DD2d3DD32A4D7f7C497eAaa23130d894911'),
    wormholeBridge: Address('0xa5f208e072434bC67592E4C49C1B991BA79BCA46'),
    chainId: 23,
  },
  [Network.OPTIMISM_MAINNET]: {
    relayer: Address('0x27428DD2d3DD32A4D7f7C497eAaa23130d894911'),
    wormholeBridge: Address('0xEe91C335eab126dF5fDB3797EA9d6aD93aeC9722'),
    chainId: 10,
  },
  [Network.POLYGON_MAINNET]: {
    relayer: Address('0x27428DD2d3DD32A4D7f7C497eAaa23130d894911'),
    wormholeBridge: Address('0x7A4B5a56256163F07b2C80A7cA55aBE66c4ec4d7'),
    chainId: 5,
  },
  [Network.BASE_MAINNET]: {
    relayer: Address('0x706F82e9bb5b0813501714Ab5974216704980e31'),
    wormholeBridge: Address('0xbebdb6C8ddC678FfA9f8748f85C815C556Dd8ac6'),
    chainId: 30,
  },
  [Network.AVALANCHE_MAINNET]: {
    relayer: Address('0x27428DD2d3DD32A4D7f7C497eAaa23130d894911'),
    wormholeBridge: Address('0x54a8e5f9c4CbA08F9943965859F6c34eAF03E26c'),
    chainId: 6,
  },

  // testnets
  [Network.BSC_TESTNET]: {
    relayer: Address('0x80aC94316391752A193C1c47E27D382b507c93F3'),
    wormholeBridge: Address('0x68605AD7b15c732a30b1BbC62BE8F2A509D74b4D'),
    chainId: 4,
  },
  [Network.AVALANCHE_TESTNET]: {
    relayer: Address('0xA3cF45939bD6260bcFe3D66bc73d60f19e49a8BB'),
    wormholeBridge: Address('0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C'),
    chainId: 6,
  },
  [Network.POLYGON_TESTNET]: {
    relayer: Address('0x0591C25ebd0580E0d4F27A82Fc2e24E7489CB5e0'),
    wormholeBridge: Address('0x0CBE91CF822c73C2315FB05100C2F714765d5c20'),
    chainId: 5,
  },

  // devnet
  [Network.LOCALHOST]: {
    relayer: Deployment('MockRelayer'),
    wormholeBridge: Deployment('MockWormhole'),
    chainId: 0,
  },
  [Network.HARDHAT]: {
    relayer: Deployment('MockRelayer'),
    wormholeBridge: Deployment('MockWormhole'),
    chainId: 0,
  },
})
