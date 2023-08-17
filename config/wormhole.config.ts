import {
  Address,
  Deployment,
  IWormholeAdaptorConfig,
  IWormholeConfig,
  Network,
  PartialRecord,
  PoolName,
} from '../types'
import { Token } from './token'
import { injectForkNetwork } from './pools.config'

// Wormhole chain id link to mapping with Network
// See https://docs.wormhole.com/wormhole/blockchain-environments/contracts
export enum WormholeChainIDTest {
  LOCALHOST = 0,
  HARDHAT = 0,
  ARBITRUM_TESTNET = 23,
  AVALANCHE_TESTNET = 6,
  BSC_TESTNET = 4,
  POLYGON_TESTNET = 5,
}

// Wormhole chain id link to mapping with Network
// See https://docs.wormhole.com/wormhole/blockchain-environments/contracts
export enum WormholeChainID {
  ARBITRUM_MAINNET = 23,
  BSC_MAINNET = 4,
  ETHEREUM_MAINNET = 2,
  OPTIMISM_MAINNET = 10,
  POLYGON_MAINNET = 5,
}

export enum NetworkGroup {
  HARDHAT,
  MAINNET,
  TESTNET,
}

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
  [Network.HARDHAT]: {
    stablecoinPool: {
      // Mocking Address for testing purpose only!
      adaptorAddr: Address('0x0000000000000000000000000000000000000001'),
      tokens: [Token.BUSD, Token.vUSDC],
    },
  },
  [Network.LOCALHOST]: {
    stablecoinPool: {
      // Mocking Address for testing purpose only!
      adaptorAddr: Address('0x0000000000000000000000000000000000000001'),
      // Work around for testing
      tokens: [Token.BUSD, Token.vUSDC],
    },
  },
  [Network.BSC_TESTNET]: {
    stablecoinPool: {
      adaptorAddr: Deployment('bsc_testnet/WormholeAdaptor_stablecoinPool_Proxy'),
      tokens: [Token.BUSD, Token.vUSDC],
    },
  },
  [Network.AVALANCHE_TESTNET]: {
    stablecoinPool: {
      adaptorAddr: Deployment('avax_testnet/WormholeAdaptor_stablecoinPool_Proxy'),
      tokens: [Token.BUSD, Token.vUSDC],
    },
  },
})

export const NETWORK_GROUP_MAP: Record<Network, NetworkGroup> = {
  [Network.HARDHAT]: NetworkGroup.HARDHAT,
  [Network.LOCALHOST]: NetworkGroup.HARDHAT,
  [Network.BSC_MAINNET]: NetworkGroup.MAINNET,
  [Network.BSC_TESTNET]: NetworkGroup.TESTNET,
  [Network.POLYGON_MAINNET]: NetworkGroup.MAINNET,
  [Network.POLYGON_TESTNET]: NetworkGroup.TESTNET,
  [Network.AVALANCHE_TESTNET]: NetworkGroup.TESTNET,
  [Network.ARBITRUM_MAINNET]: NetworkGroup.MAINNET,
  [Network.ARBITRUM_TESTNET]: NetworkGroup.TESTNET,
  [Network.OPTIMISM_MAINNET]: NetworkGroup.MAINNET,
  [Network.OPTIMISM_TESTNET]: NetworkGroup.TESTNET,
  [Network.ETHEREUM_MAINNET]: NetworkGroup.MAINNET,
}

export const WORMHOLE_ID_CONFIG_MAP: PartialRecord<Network, WormholeChainID | WormholeChainIDTest> = injectForkNetwork<
  WormholeChainID | WormholeChainIDTest
>({
  [Network.HARDHAT]: WormholeChainIDTest.HARDHAT,
  [Network.LOCALHOST]: WormholeChainIDTest.LOCALHOST,

  [Network.BSC_MAINNET]: WormholeChainID.BSC_MAINNET,
  [Network.POLYGON_MAINNET]: WormholeChainID.POLYGON_MAINNET,
  [Network.ARBITRUM_MAINNET]: WormholeChainID.ARBITRUM_MAINNET,
  [Network.OPTIMISM_MAINNET]: WormholeChainID.OPTIMISM_MAINNET,
  [Network.ETHEREUM_MAINNET]: WormholeChainID.ETHEREUM_MAINNET,

  [Network.BSC_TESTNET]: WormholeChainIDTest.BSC_TESTNET,
  [Network.POLYGON_TESTNET]: WormholeChainIDTest.POLYGON_TESTNET,
  [Network.AVALANCHE_TESTNET]: WormholeChainIDTest.AVALANCHE_TESTNET,
  [Network.ARBITRUM_TESTNET]: WormholeChainIDTest.ARBITRUM_TESTNET,
})
