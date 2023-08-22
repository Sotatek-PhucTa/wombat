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

export enum NetworkGroup {
  HARDHAT,
  MAINNET,
  TESTNET,
}

export const WORMHOLE_CONFIG_MAPS: PartialRecord<Network, IWormholeConfig> = injectForkNetwork<IWormholeConfig>({
  // https://docs.wormhole.com/wormhole/blockchain-environments/evm

  // mainnets
  [Network.BSC_MAINNET]: {
    relayer: '0x27428DD2d3DD32A4D7f7C497eAaa23130d894911',
    wormholeBridge: '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B',
  },

  // testnets
  [Network.BSC_TESTNET]: {
    relayer: '0x80aC94316391752A193C1c47E27D382b507c93F3',
    wormholeBridge: '0x68605AD7b15c732a30b1BbC62BE8F2A509D74b4D',
  },
  [Network.AVALANCHE_TESTNET]: {
    relayer: '0xA3cF45939bD6260bcFe3D66bc73d60f19e49a8BB',
    wormholeBridge: '0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C',
  },
  [Network.POLYGON_TESTNET]: {
    relayer: '0x0591C25ebd0580E0d4F27A82Fc2e24E7489CB5e0',
    wormholeBridge: '0x0CBE91CF822c73C2315FB05100C2F714765d5c20',
  },

  // devnet
  [Network.LOCALHOST]: {
    relayer: '0x0000000000000000000000000000000000000000',
    wormholeBridge: '0x0000000000000000000000000000000000000000',
  },
  [Network.HARDHAT]: {
    relayer: '0x0000000000000000000000000000000000000000',
    wormholeBridge: '0x0000000000000000000000000000000000000000',
  },
})

export enum CrossChainPoolType {
  stablecoin = 'Stablecoin_Pool',
}

// To update deployment config, update `CROSS_CHAIN_POOL_TOKENS_MAP` instead. I have no idea when will this config be used
export const WORMHOLE_ADAPTOR_CONFIG_MAP: PartialRecord<
  Network,
  Record<CrossChainPoolType, IWormholeAdaptorConfig>
> = injectForkNetwork<Record<CrossChainPoolType, IWormholeAdaptorConfig>>({
  [Network.HARDHAT]: {
    [CrossChainPoolType.stablecoin]: {
      // Mocking Address for testing purpose only!
      adaptorAddr: Address('0x0000000000000000000000000000000000000001'),
      tokens: [Token.BUSD, Token.vUSDC],
    },
  },
  [Network.LOCALHOST]: {
    [CrossChainPoolType.stablecoin]: {
      // Mocking Address for testing purpose only!
      adaptorAddr: Address('0x0000000000000000000000000000000000000001'),
      // Work around for testing
      tokens: [Token.BUSD, Token.vUSDC],
    },
  },
  // Testnet
  [Network.BSC_TESTNET]: {
    [CrossChainPoolType.stablecoin]: {
      adaptorAddr: Deployment('WormholeAdaptor_Stablecoin_Pool_Proxy', Network.BSC_TESTNET),
      tokens: [Token.BUSD, Token.vUSDC],
    },
  },
  [Network.AVALANCHE_TESTNET]: {
    [CrossChainPoolType.stablecoin]: {
      adaptorAddr: Deployment('WormholeAdaptor_Stablecoin_Pool_Proxy', Network.AVALANCHE_TESTNET),
      tokens: [Token.BUSD, Token.vUSDC],
    },
  },
  [Network.POLYGON_TESTNET]: {
    [CrossChainPoolType.stablecoin]: {
      adaptorAddr: Deployment('WormholeAdaptor_Stablecoin_Pool_Proxy', Network.POLYGON_TESTNET),
      tokens: [Token.USDC, Token.USDT, Token.axlUSDC],
    },
  },
  // Mainnet
  [Network.BSC_MAINNET]: {
    [CrossChainPoolType.stablecoin]: {
      adaptorAddr: Deployment('WormholeAdaptor_Stablecoin_Pool_Proxy', Network.BSC_MAINNET),
      tokens: [Token.USDC, Token.USDT],
    },
  },
  [Network.ARBITRUM_MAINNET]: {
    [CrossChainPoolType.stablecoin]: {
      adaptorAddr: Deployment('WormholeAdaptor_Stablecoin_Pool_Proxy', Network.ARBITRUM_MAINNET),
      tokens: [Token.USDC, Token.USDT],
    },
  },
  [Network.ETHEREUM_MAINNET]: {
    [CrossChainPoolType.stablecoin]: {
      adaptorAddr: Deployment('WormholeAdaptor_Stablecoin_Pool_Proxy', Network.ETHEREUM_MAINNET),
      tokens: [Token.USDC, Token.USDT],
    },
  },
})

const NETWORK_GROUP_MAP: Record<Network, NetworkGroup> = {
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

type WormholeChainID = 0 | 2 | 4 | 5 | 6 | 10 | 23

// See https://docs.wormhole.com/wormhole/blockchain-environments/contracts
export const WORMHOLE_ID_CONFIG_MAP: PartialRecord<Network, WormholeChainID> = injectForkNetwork<WormholeChainID>({
  [Network.HARDHAT]: 0,
  [Network.LOCALHOST]: 0,

  [Network.BSC_MAINNET]: 4,
  [Network.POLYGON_MAINNET]: 5,
  [Network.ARBITRUM_MAINNET]: 23,
  [Network.OPTIMISM_MAINNET]: 10,
  [Network.ETHEREUM_MAINNET]: 2,

  [Network.BSC_TESTNET]: 4,
  [Network.POLYGON_TESTNET]: 5,
  [Network.AVALANCHE_TESTNET]: 6,
  [Network.ARBITRUM_TESTNET]: 23,
})

interface IPoolNetworkGroup {
  poolType: CrossChainPoolType
  network: Network
}

export async function getOtherAdaptorsInGroup(
  poolType: CrossChainPoolType,
  network: Network
): Promise<IPoolNetworkGroup[]> {
  const result = []
  for (const [otherNetwork, adaptorConfig] of Object.entries(WORMHOLE_ADAPTOR_CONFIG_MAP)) {
    if (network === otherNetwork) continue
    for (const otherPoolType of Object.keys(adaptorConfig)) {
      if (NETWORK_GROUP_MAP[network] === NETWORK_GROUP_MAP[otherNetwork as Network] && otherPoolType === poolType) {
        result.push({
          poolType: otherPoolType,
          network: otherNetwork as Network,
        })
      }
    }
  }
  return result
}
