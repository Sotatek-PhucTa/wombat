import {
  Address,
  CrossChainMessagerType,
  Deployment,
  IAdaptorConfig,
  ICrossChainMessagerConfig,
  Network,
  PartialRecord,
} from '../types'
import { getAddress } from '../utils'
import { getLayerZeroAdaptorDeploymentName, getWormholeAdaptorDeploymentName } from '../utils/deploy'
import { LAYERZERO_CONFIG_MAPS } from './layerzero.config'
import { injectForkNetwork } from './pools.config'
import { Token, getTokenDeploymentOrAddress } from './token'
import { WORMHOLE_CONFIG_MAPS } from './wormhole.config'

export enum CrossChainPoolType {
  stablecoin = 'Stablecoin_Pool',
  layerZeroStablecoin = 'LayerZero_Stablecoin_Pool',
}

// To update deployment config, update `CROSS_CHAIN_POOL_TOKENS_MAP` instead. I have no idea when will this config be used
export const ADAPTOR_CONFIG_MAP: PartialRecord<
  Network,
  PartialRecord<CrossChainPoolType, IAdaptorConfig>
> = injectForkNetwork<PartialRecord<CrossChainPoolType, IAdaptorConfig>>({
  [Network.HARDHAT]: {
    [CrossChainPoolType.stablecoin]: {
      // Mocking Address for testing purpose only!
      adaptorAddr: Address('0x0000000000000000000000000000000000000001'),
      tokens: [Token.BUSD, Token.vUSDC],
      type: CrossChainMessagerType.WORMHOLE,
    },
    [CrossChainPoolType.layerZeroStablecoin]: {
      // Mocking Address for testing purpose only!
      adaptorAddr: Address('0x0000000000000000000000000000000000000002'),
      tokens: [Token.BUSD, Token.vUSDC],
      type: CrossChainMessagerType.LAYERZERO,
    },
  },
  [Network.LOCALHOST]: {
    [CrossChainPoolType.stablecoin]: {
      // Mocking Address for testing purpose only!
      adaptorAddr: Address('0x0000000000000000000000000000000000000001'),
      // Work around for testing
      tokens: [Token.BUSD, Token.vUSDC],
      type: CrossChainMessagerType.WORMHOLE,
    },
    [CrossChainPoolType.layerZeroStablecoin]: {
      // Mocking Address for testing purpose only!
      adaptorAddr: Address('0x0000000000000000000000000000000000000002'),
      tokens: [Token.BUSD, Token.vUSDC],
      type: CrossChainMessagerType.LAYERZERO,
    },
  },
  // Testnet
  [Network.BSC_TESTNET]: {
    [CrossChainPoolType.stablecoin]: {
      adaptorAddr: Deployment('WormholeAdaptor_Stablecoin_Pool_Proxy', Network.BSC_TESTNET),
      tokens: [Token.BUSD, Token.vUSDC],
      type: CrossChainMessagerType.WORMHOLE,
    },
  },
  [Network.AVALANCHE_TESTNET]: {
    [CrossChainPoolType.stablecoin]: {
      adaptorAddr: Deployment('WormholeAdaptor_Stablecoin_Pool_Proxy', Network.AVALANCHE_TESTNET),
      tokens: [Token.BUSD, Token.vUSDC],
      type: CrossChainMessagerType.WORMHOLE,
    },
  },
  [Network.POLYGON_TESTNET]: {
    [CrossChainPoolType.stablecoin]: {
      adaptorAddr: Deployment('WormholeAdaptor_Stablecoin_Pool_Proxy', Network.POLYGON_TESTNET),
      tokens: [Token.USDC, Token.USDT, Token.axlUSDC],
      type: CrossChainMessagerType.WORMHOLE,
    },
  },
  [Network.SCROLL_TESTNET]: {
    [CrossChainPoolType.stablecoin]: {
      adaptorAddr: Deployment('WormholeAdaptor_Stablecoin_Pool_Proxy', Network.POLYGON_TESTNET),
      tokens: [Token.BUSD, Token.vUSDC],
      type: CrossChainMessagerType.WORMHOLE,
    },
  },
  // Mainnet
  [Network.BSC_MAINNET]: {
    [CrossChainPoolType.stablecoin]: {
      adaptorAddr: Deployment('WormholeAdaptor_Stablecoin_Pool_Proxy', Network.BSC_MAINNET),
      tokens: [Token.USDC, Token.USDT],
      type: CrossChainMessagerType.WORMHOLE,
    },
  },
  [Network.ARBITRUM_MAINNET]: {
    [CrossChainPoolType.stablecoin]: {
      adaptorAddr: Deployment('WormholeAdaptor_Stablecoin_Pool_Proxy', Network.ARBITRUM_MAINNET),
      tokens: [Token.USDC, Token.USDT],
      type: CrossChainMessagerType.WORMHOLE,
    },
  },
  [Network.ETHEREUM_MAINNET]: {
    [CrossChainPoolType.stablecoin]: {
      adaptorAddr: Deployment('WormholeAdaptor_Stablecoin_Pool_Proxy', Network.ETHEREUM_MAINNET),
      tokens: [Token.USDC, Token.USDT],
      type: CrossChainMessagerType.WORMHOLE,
    },
  },
  [Network.OPTIMISM_MAINNET]: {
    [CrossChainPoolType.stablecoin]: {
      adaptorAddr: Deployment('WormholeAdaptor_Stablecoin_Pool_Proxy', Network.OPTIMISM_MAINNET),
      tokens: [Token.USDC, Token.USDT],
      type: CrossChainMessagerType.WORMHOLE,
    },
  },
  [Network.BASE_MAINNET]: {
    [CrossChainPoolType.stablecoin]: {
      adaptorAddr: Deployment('WormholeAdaptor_Stablecoin_Pool_Proxy', Network.BASE_MAINNET),
      tokens: [Token.USDC, Token.USDbC],
      type: CrossChainMessagerType.WORMHOLE,
    },
  },
  [Network.POLYGON_MAINNET]: {
    [CrossChainPoolType.stablecoin]: {
      adaptorAddr: Deployment('WormholeAdaptor_Stablecoin_Pool_Proxy', Network.POLYGON_MAINNET),
      tokens: [Token.USDC, Token.USDT],
      type: CrossChainMessagerType.WORMHOLE,
    },
  },
  [Network.AVALANCHE_MAINNET]: {
    [CrossChainPoolType.stablecoin]: {
      adaptorAddr: Deployment('WormholeAdaptor_Stablecoin_Pool_Proxy', Network.AVALANCHE_MAINNET),
      tokens: [Token.USDC, Token.USDT],
      type: CrossChainMessagerType.WORMHOLE,
    },
  },
})

export enum NetworkGroup {
  HARDHAT,
  MAINNET,
  TESTNET,
}

const NETWORK_GROUP_MAP: Record<Network, NetworkGroup> = {
  [Network.HARDHAT]: NetworkGroup.HARDHAT,
  [Network.LOCALHOST]: NetworkGroup.HARDHAT,
  [Network.BSC_MAINNET]: NetworkGroup.MAINNET,
  [Network.BSC_TESTNET]: NetworkGroup.TESTNET,
  [Network.POLYGON_MAINNET]: NetworkGroup.MAINNET,
  [Network.POLYGON_TESTNET]: NetworkGroup.TESTNET,
  [Network.AVALANCHE_TESTNET]: NetworkGroup.TESTNET,
  [Network.AVALANCHE_MAINNET]: NetworkGroup.MAINNET,
  [Network.ARBITRUM_MAINNET]: NetworkGroup.MAINNET,
  [Network.ARBITRUM_TESTNET]: NetworkGroup.TESTNET,
  [Network.OPTIMISM_MAINNET]: NetworkGroup.MAINNET,
  [Network.OPTIMISM_TESTNET]: NetworkGroup.TESTNET,
  [Network.ETHEREUM_MAINNET]: NetworkGroup.MAINNET,
  [Network.BASE_MAINNET]: NetworkGroup.MAINNET,
}

interface IPoolNetworkGroup {
  poolType: CrossChainPoolType
  network: Network
}

export function getCrossChainMessagerConfig(type: CrossChainMessagerType, network: Network): ICrossChainMessagerConfig {
  let config: ICrossChainMessagerConfig | undefined
  if (type == CrossChainMessagerType.WORMHOLE) {
    config = WORMHOLE_CONFIG_MAPS[network]
  } else {
    config = LAYERZERO_CONFIG_MAPS[network]
  }
  if (config === undefined) {
    console.error('CrossChainMessagerConfig is undefined')
    throw 'CrossChainMessagerConfig is undefined'
  }
  return config
}

export function getAdaptorMessagerType(poolType: CrossChainPoolType, network: Network): CrossChainMessagerType {
  const type = ADAPTOR_CONFIG_MAP[network]?.[poolType]?.type
  if (type == undefined) {
    throw Error(`Not found CrossChainMessagerType config for ${poolType} on ${network}`)
  }
  return type
}

export function getAdaptorContracName(type: CrossChainMessagerType): string {
  if (type === CrossChainMessagerType.WORMHOLE) {
    return 'WormholeAdaptor'
  } else {
    return 'LayerZeroAdaptor'
  }
}

export function getAdaptorDeploymentName(type: CrossChainMessagerType, poolName: string): string {
  if (type === CrossChainMessagerType.WORMHOLE) {
    return getWormholeAdaptorDeploymentName(poolName)
  } else {
    return getLayerZeroAdaptorDeploymentName(poolName)
  }
}

export async function getOtherAdaptorsInGroup(
  poolType: CrossChainPoolType,
  network: Network
): Promise<IPoolNetworkGroup[]> {
  const result: IPoolNetworkGroup[] = []
  for (const [otherNetwork, adaptorConfig] of Object.entries(ADAPTOR_CONFIG_MAP)) {
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

export async function loopAdaptorInGroup(
  poolType: CrossChainPoolType,
  network: Network,
  handleAdaptor: (otherNetwork: Network, otherChainId: number, otherAdaptorAddr: string) => Promise<any>,
  handleToken: (otherNetwork: Network, otherChainId: number, tokenAddr: string) => Promise<any>
) {
  const othersInGroup = await getOtherAdaptorsInGroup(poolType as CrossChainPoolType, network)
  // We only approve the adaptor if it is within the same network group
  for (const other of othersInGroup) {
    const otherNetwork = other.network
    const otherConfig = ADAPTOR_CONFIG_MAP[otherNetwork]?.[other.poolType]
    if (otherConfig) {
      const messagerType = otherConfig.type
      const otherAdaptorAddr = await getAddress(otherConfig.adaptorAddr)
      const tokens = otherConfig.tokens

      const chainId =
        messagerType == CrossChainMessagerType.WORMHOLE
          ? WORMHOLE_CONFIG_MAPS[otherNetwork]?.chainId
          : LAYERZERO_CONFIG_MAPS[otherNetwork]?.chainId

      // Set missed adaptor within the same network group
      if (chainId !== undefined) {
        await handleAdaptor(otherNetwork, chainId, otherAdaptorAddr)

        // Approve missed tokens from other chains within the same group
        for (const token of tokens) {
          const tokenDeployment = getTokenDeploymentOrAddress(token, otherNetwork)
          const tokenAddr = await getAddress(tokenDeployment)
          await handleToken(otherNetwork, chainId, tokenAddr)
        }
      }
    }
  }
}
